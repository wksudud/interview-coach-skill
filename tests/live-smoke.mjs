const urls = [
  "https://interview-coach-skill.netlify.app/",
  "https://wksudud.github.io/interview-coach-skill/",
];

const timeout = (ms = 15000) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

for (const url of urls) {
  const response = await Promise.race([fetch(url), timeout()]);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  const text = await response.text();
  if (!text.includes("AI")) {
    throw new Error(`${url} did not return the expected page`);
  }
  console.log(`LIVE OK ${url}`);
}
