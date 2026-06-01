import "dotenv/config";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { google } from "googleapis";
import { htmlToText } from "html-to-text";
import { TeamBuildrParser } from "./team-buildr-parser.js";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CREDENTIALS_PATH = path.resolve("credentials.json");
const TOKEN_PATH = path.resolve("token.json");
const OUTPUT_PATH = path.resolve("public/imported-workouts.json");
const DEFAULT_QUERY = 'subject:"TeamBuildr - Workout Reminder"';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost:42813/oauth2callback";

async function main() {
  const query = process.env.GMAIL_QUERY || DEFAULT_QUERY;
  const maxResults = Number(process.env.GMAIL_MAX_RESULTS || 50);
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });
  const messages = await listMessages(gmail, query, maxResults);
  const parser = new TeamBuildrParser();
  const sessions = [];

  for (const message of messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full"
    });
    const body = bodyFromPayload(fullMessage.data.payload);
    const subject = headerValue(fullMessage.data.payload, "Subject");
    if (!body.trim()) continue;
    sessions.push(parser.parseMessage({
      id: fullMessage.data.id,
      subject,
      internalDate: fullMessage.data.internalDate,
      body
    }));
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date));
  const program = {
    sourceLabel: `Gmail import: ${sessions.length} TeamBuildr workout emails`,
    mesocycles: [],
    sessions
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(program, null, 2));
  console.log(`Imported ${sessions.length} workouts from Gmail.`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

async function authorize() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf8"));
  const config = credentials.installed ?? credentials.web;
  if (!config?.client_id || !config?.client_secret) {
    throw new Error("credentials.json is missing an OAuth client_id or client_secret.");
  }

  const client = new google.auth.OAuth2(config.client_id, config.client_secret, REDIRECT_URI);
  const savedToken = await readToken();
  if (savedToken) {
    client.setCredentials(savedToken);
    return client;
  }

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES
  });
  console.log("Open this Google OAuth URL if your browser does not open automatically:");
  console.log(authUrl);
  execFile("open", [authUrl], () => {});

  const code = await waitForOAuthCode();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return client;
}

async function readToken() {
  try {
    return JSON.parse(await fs.readFile(TOKEN_PATH, "utf8"));
  } catch {
    return null;
  }
}

function waitForOAuthCode() {
  const redirect = new URL(REDIRECT_URI);
  const port = Number(redirect.port || 80);
  const expectedPath = redirect.pathname;

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, REDIRECT_URI);
      if (url.pathname !== expectedPath) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      if (error || !code) {
        response.writeHead(400, { "Content-Type": "text/plain" });
        response.end("OAuth failed. You can close this tab.");
        server.close();
        reject(new Error(error || "OAuth callback did not include a code."));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("Gmail access approved. You can close this tab and return to Codex.");
      server.close();
      resolve(code);
    });

    server.once("error", reject);
    server.listen(port, redirect.hostname, () => {
      console.log(`Waiting for OAuth callback on ${REDIRECT_URI}`);
    });
  });
}

async function listMessages(gmail, q, maxResults) {
  const found = [];
  let pageToken;
  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: Math.min(100, maxResults - found.length),
      pageToken
    });
    found.push(...(response.data.messages ?? []));
    pageToken = response.data.nextPageToken;
  } while (pageToken && found.length < maxResults);
  return found.slice(0, maxResults);
}

function headerValue(payload, name) {
  return payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function bodyFromPayload(payload) {
  const parts = flattenParts(payload);
  const htmlPart = parts.find((part) => part.mimeType === "text/html" && part.body?.data);
  if (htmlPart) {
    return htmlToText(decodeBase64Url(htmlPart.body.data), {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" }
      ]
    });
  }
  const textPart = parts.find((part) => part.mimeType === "text/plain" && part.body?.data);
  if (textPart) return decodeBase64Url(textPart.body.data);
  return payload?.body?.data ? decodeBase64Url(payload.body.data) : "";
}

function flattenParts(part) {
  if (!part) return [];
  return [part, ...(part.parts ?? []).flatMap(flattenParts)];
}

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
