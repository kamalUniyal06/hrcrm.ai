// The HRCRM token is exchanged for an assessment-only token. Both stay in memory.
export function createRecruitmentSession({ getCrmToken, clearCrmToken, request, now = () => Date.now() }) {
  let token = "";
  let expiresAt = 0;
  let session = null;
  let pending = null;
  let generation = 0;
  function reset() { token = ""; expiresAt = 0; session = null; pending = null; generation += 1; }
  async function exchange(version) {
    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const crmToken = await getCrmToken();
      try {
        data = await request("/integrations/hrcrm/session", { method: "POST", token: crmToken });
        break;
      } catch (error) {
        if (error.status !== 401 || attempt === 1) throw error;
        clearCrmToken();
      }
    }
    if (version !== generation) throw new Error("The HRCRM account changed. Please retry.");
    if (!data?.access_token || !data.user || !Number.isFinite(data.expires_in) || data.expires_in <= 0)
      throw new Error("The recruitment backend needs the HRCRM token integration update.");
    token = data.access_token;
    expiresAt = now() + data.expires_in * 1000;
    session = { user: data.user };
    return session;
  }
  function ensure() {
    if (token && now() < expiresAt - 10000) return Promise.resolve(session);
    if (pending) return pending;
    const version = generation;
    const current = exchange(version);
    pending = current;
    current.then(() => { if (pending === current) pending = null; }, () => { if (pending === current) pending = null; });
    return current;
  }
  async function authenticatedRequest(path, options = {}) {
    if (!/^\/(?:invitations|candidates)(?:\/[^/?]+)?$/.test(path)) throw new Error("This endpoint is outside the assessment integration.");
    await ensure();
    const version = generation;
    const usedToken = token;
    try { return await request(`/integrations/hrcrm${path}`, { ...options, token: usedToken }); }
    catch (error) {
      if (error.status !== 401 || options.signal?.aborted || version !== generation) throw error;
      if (token === usedToken) { token = ""; expiresAt = 0; }
      await ensure();
      return request(`/integrations/hrcrm${path}`, { ...options, token });
    }
  }
  return { ensure, request: authenticatedRequest, reset };
}
