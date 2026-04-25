import { validateUsername } from "../lib/username";

const cases = [
  { input: "dragon92", want: "ok" },
  { input: "Dragon92", want: "ok", expected: "dragon92" },
  { input: "  hero_kid  ", want: "ok", expected: "hero_kid" },
  { input: "ab", want: "fail" },
  { input: "this_username_is_way_too_long_22", want: "fail" },
  { input: "no spaces", want: "fail" },
  { input: "hyphens-no", want: "fail" },
  { input: "admin", want: "fail" },
  { input: "Anthropic", want: "fail" },
  { input: "", want: "fail" },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const r = validateUsername(c.input);
  const okMatches = (c.want === "ok" && r.ok) || (c.want === "fail" && !r.ok);
  const valueMatches = !c.expected || (r.ok && r.value === c.expected);
  if (okMatches && valueMatches) {
    pass++;
    console.log(`PASS  ${JSON.stringify(c.input)} → ${r.ok ? r.value : r.error}`);
  } else {
    fail++;
    console.log(`FAIL  ${JSON.stringify(c.input)} → ${JSON.stringify(r)}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
