export class SupabaseProgramRepository {
  constructor({ supabase, userId, localRepository }) {
    this.supabase = supabase;
    this.userId = userId;
    this.localRepository = localRepository;
  }

  async loadProfile() {
    const remote = await this.remoteSingle("profiles", "profile");
    if (remote) {
      this.localRepository.write("jump-profile-v1", remote);
      return remote;
    }
    return this.localRepository.loadProfile();
  }

  async saveProfile(profile) {
    this.localRepository.saveProfile(profile);
    await this.upsert("profiles", { profile: profile.toJSON() });
  }

  async loadProgram() {
    const remote = await this.remoteSingle("programs", "program");
    if (remote) {
      this.localRepository.write("jump-program-v1", remote);
      return remote;
    }
    return this.localRepository.loadProgram();
  }

  async saveProgram(program) {
    this.localRepository.saveProgram(program);
    await this.upsert("programs", { program: program.toJSON() });
  }

  async loadReadiness() {
    const { data, error } = await this.supabase
      .from("readiness_logs")
      .select("session_id, readiness")
      .eq("user_id", this.userId);
    if (error) return this.localRepository.loadReadiness();
    const readiness = Object.fromEntries((data ?? []).map((row) => [row.session_id, row.readiness]));
    this.localRepository.saveReadiness(readiness);
    return readiness;
  }

  async saveReadiness(readiness) {
    this.localRepository.saveReadiness(readiness);
    const rows = Object.entries(readiness ?? {}).map(([sessionId, value]) => ({
      user_id: this.userId,
      session_id: sessionId,
      date: value?.date ?? null,
      readiness: value,
      updated_at: new Date().toISOString()
    }));
    if (rows.length === 0) return;
    const { error } = await this.supabase
      .from("readiness_logs")
      .upsert(rows, { onConflict: "user_id,session_id" });
    if (error) throw error;
  }

  async importLocalData({ profile, program, readiness }) {
    if (profile) await this.saveProfile(profile);
    if (program) await this.saveProgram(program);
    if (readiness) await this.saveReadiness(readiness);
  }

  async hasRemoteData() {
    const [profile, program] = await Promise.all([
      this.exists("profiles"),
      this.exists("programs")
    ]);
    return profile || program;
  }

  async remoteSingle(table, column) {
    const { data, error } = await this.supabase
      .from(table)
      .select(column)
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) return null;
    return data?.[column] ?? null;
  }

  async exists(table) {
    const { data, error } = await this.supabase
      .from(table)
      .select("user_id")
      .eq("user_id", this.userId)
      .maybeSingle();
    return !error && Boolean(data);
  }

  async upsert(table, payload) {
    const { error } = await this.supabase
      .from(table)
      .upsert({
        user_id: this.userId,
        ...payload,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  }
}
