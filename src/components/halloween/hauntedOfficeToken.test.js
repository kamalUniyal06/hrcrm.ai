import test from "node:test";
import assert from "node:assert/strict";
import { canSeeHalloween, decryptName, encryptName, hauntedOfficeBoardLink, hauntedOfficeLink, hauntedOfficePlayer, isHalloweenSeason, parseEmailList, phoneLink, slug } from "./hauntedOfficeToken.js";

const KEY = "test-key-only";

test("a token made here decrypts with the same key, and fails with another", async () => {
  const token = await encryptName("  Priya Sharma  ", { emp: "a1b2c3" }, KEY);
  assert.match(token, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.deepEqual(await decryptName(token, KEY), { name: "Priya Sharma", emp: "a1b2c3" });
  assert.equal(await decryptName(token, "other-key"), null);
  const [v, iv, ct, sig] = token.split(".");
  assert.equal(await decryptName([v, iv, ct, sig.slice(0, -2) + "AA"].join("."), KEY), null);
});

test("names and ids are trimmed to the game's limits", async () => {
  const token = await encryptName("A very long employee name indeed", {}, KEY);
  const data = await decryptName(token, KEY);
  assert.equal(data.name, "A very long employee nam");
  assert.equal(data.emp, slug("A very long employee name indeed"));
  await assert.rejects(() => encryptName("Priya", {}, ""), /not configured/);
});

test("the link carries the token in ?t=", () => {
  assert.equal(hauntedOfficeLink("https://game.example.com/", "v1.a.b.c"), "https://game.example.com/?t=v1.a.b.c");
  assert.equal(hauntedOfficeLink("https://game.example.com/play?mode=x", "v1.a.b.c"), "https://game.example.com/play?mode=x&t=v1.a.b.c");
});

test("phone links never point at localhost", () => {
  assert.deepEqual(phoneLink("https://game.example.com/?t=v1.a", "localhost"), { link: "https://game.example.com/?t=v1.a", reachable: true });
  assert.deepEqual(phoneLink("http://localhost:5174/?t=v1.a", "192.168.1.20"), { link: "http://192.168.1.20:5174/?t=v1.a", reachable: true });
  assert.equal(phoneLink("http://localhost:5174/?t=v1.a", "localhost").reachable, false);
  assert.equal(phoneLink("http://127.0.0.1:5174/", "").reachable, false);
});

test("the leaderboard is board.html next to the game", () => {
  assert.equal(hauntedOfficeBoardLink("http://localhost:5174/"), "http://localhost:5174/board.html");
  assert.equal(hauntedOfficeBoardLink("http://localhost:5174"), "http://localhost:5174/board.html");
  assert.equal(hauntedOfficeBoardLink("https://x.app/games/haunted/?mode=1"), "https://x.app/games/haunted/board.html");
  assert.equal(hauntedOfficeBoardLink("https://x.app/games/index.html"), "https://x.app/games/board.html");
});

test("the player is the display name and the employee id without dashes", () => {
  assert.deepEqual(
    hauntedOfficePlayer({ name: "Jatin Verma", email: "jatin@x.com", employeeId: "d77fdd1c-027e-891a-dbd7-6ab2088b426e" }),
    { name: "Jatin Verma", emp: "d77fdd1c027e891adbd76ab2088b426e" },
  );
  assert.deepEqual(hauntedOfficePlayer({ email: "verma.jatin@x.com" }), { name: "verma jatin", emp: "verma-jatin-x-com" });
});

test("the theme setting decides who sees Halloween", () => {
  const admin = { isAdmin: true, isEmployee: false };
  const employee = { isAdmin: false, isEmployee: true };
  const candidate = { isAdmin: false, isEmployee: false };
  assert.equal(canSeeHalloween("admin", admin), true);
  assert.equal(canSeeHalloween(" Admin ", employee), false);
  assert.equal(canSeeHalloween("all", employee), true);
  assert.equal(canSeeHalloween("all", admin), true);
  assert.equal(canSeeHalloween("all", candidate), false);
  assert.equal(canSeeHalloween("off", admin), false);
  assert.equal(canSeeHalloween(undefined, employee), true);
});

test("people on the excluded list never see Halloween", () => {
  const excluded = " Boss@Company.com, hr.lead@company.com;ops@company.com ";
  assert.equal(canSeeHalloween("all", { isAdmin: true, email: "boss@company.com" }, excluded), false);
  assert.equal(canSeeHalloween("admin", { isAdmin: true, email: "HR.Lead@company.com" }, excluded), false);
  assert.equal(canSeeHalloween("all", { isEmployee: true, email: "ops@company.com" }, excluded), false);
  assert.equal(canSeeHalloween("all", { isEmployee: true, email: "priya@company.com" }, excluded), true);
  assert.equal(canSeeHalloween("all", { isEmployee: true, email: "" }, ""), true);
  assert.deepEqual([...parseEmailList("a@x.com,, b@x.com\nC@x.com")], ["a@x.com", "b@x.com", "c@x.com"]);
});

test("Halloween season runs from 15 October to 2 November", () => {
  assert.equal(isHalloweenSeason(new Date(2026, 9, 14)), false);
  assert.equal(isHalloweenSeason(new Date(2026, 9, 15)), true);
  assert.equal(isHalloweenSeason(new Date(2026, 9, 31)), true);
  assert.equal(isHalloweenSeason(new Date(2026, 10, 2)), true);
  assert.equal(isHalloweenSeason(new Date(2026, 10, 3)), false);
});
