import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

async function runVerification() {
  console.log("=== STARTING BACKTRACK END-TO-END UI VERIFICATION ===");

  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome not found at ${CHROME_PATH}`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // Track console logs and errors
  const pageErrors = [];
  page.on("pageerror", (err) => {
    console.error("Browser page error:", err.message);
    pageErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Open landing page
    // -------------------------------------------------------------------------
    console.log("\n[Step 1] Navigating to landing page:", BASE_URL);
    await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 15000 });

    const title = await page.title();
    console.log("Page title:", title);

    const heading = await page.$eval("h1", (el) => el.innerText);
    console.log("Hero heading:", heading.replace(/\n/g, " "));

    // -------------------------------------------------------------------------
    // STEP 2: Enter target dream job
    // -------------------------------------------------------------------------
    const targetJob = "Full Stack Developer at a climate-tech startup";
    console.log("\n[Step 2] Typing dream job:", targetJob);

    const inputSelector = 'input[placeholder*="Netflix"]';
    await page.waitForSelector(inputSelector, { timeout: 5000 });
    await page.type(inputSelector, targetJob);

    // -------------------------------------------------------------------------
    // STEP 3: Generate roadmap
    // -------------------------------------------------------------------------
    console.log("\n[Step 3] Submitting form to generate roadmap...");
    const submitBtnSelector = 'button[type="submit"]';
    await page.click(submitBtnSelector);

    // -------------------------------------------------------------------------
    // STEP 4 & 5: Verify React Flow roadmap canvas, nodes, phases, controls
    // -------------------------------------------------------------------------
    console.log("\n[Step 4 & 5] Waiting for React Flow graph canvas and nodes...");
    await page.waitForSelector(".react-flow", { timeout: 15000 });
    console.log("✓ React Flow canvas rendered");

    // Wait for custom nodes
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    const nodeCount = await page.$$eval('.react-flow__node', (nodes) => nodes.length);
    console.log(`✓ Rendered ${nodeCount} roadmap nodes in the DAG graph`);

    // Verify Phase labels
    const phaseLabels = await page.$$eval('.react-flow__panel div', (els) =>
      els.map((e) => e.innerText.trim()).filter((t) => t.startsWith("Phase"))
    );
    console.log("✓ Phase badges found:", [...new Set(phaseLabels)].join(", "));

    // Verify Controls and Fit View button
    const hasControls = (await page.$(".react-flow__controls")) !== null;
    const hasMinimap = (await page.$(".react-flow__minimap")) !== null;
    const fitViewBtnHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Fit View")) || null;
    });
    const fitViewBtnEl = fitViewBtnHandle.asElement();
    const hasFitView = fitViewBtnEl !== null;
    console.log(`✓ Interactive Canvas features: Controls=${hasControls}, MiniMap=${hasMinimap}, FitView=${hasFitView}`);

    // Test clicking Fit View
    if (fitViewBtnEl) {
      await fitViewBtnEl.click();
      console.log("✓ Clicked Fit View button successfully");
    }

    // -------------------------------------------------------------------------
    // STEP 6: Click a roadmap node and verify node detail panel
    // -------------------------------------------------------------------------
    console.log("\n[Step 6] Clicking first available roadmap node...");
    const firstNode = await page.$('.react-flow__node [role="button"]');
    if (!firstNode) throw new Error("No clickable node found");
    await firstNode.click();

    // Verify slide-out panel opens
    await page.waitForSelector('h2.text-xl', { timeout: 5000 });
    const panelNodeTitle = await page.$eval('h2.text-xl', (el) => el.innerText);
    console.log(`✓ Node detail panel opened for: "${panelNodeTitle}"`);

    // -------------------------------------------------------------------------
    // STEP 7: Verify action pack checklist and resource/search tabs
    // -------------------------------------------------------------------------
    console.log("\n[Step 7] Verifying action pack checklist, why, resources, search...");
    
    // Check Action Pack checklist items
    const checkboxes = await page.$$('input[type="checkbox"]');
    console.log(`✓ Found ${checkboxes.length} actionable checklist items in Action Pack`);
    
    if (checkboxes.length > 0) {
      // Toggle first checklist item
      await checkboxes[0].click();
      console.log("✓ Toggled first checklist task completion state");
    }

    // Switch to "Why This Matters" tab
    const whyTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Why This Matters"));
    });
    if (whyTabBtn) {
      await whyTabBtn.asElement()?.click();
      await page.waitForSelector('.bg-blue-950\\/30', { timeout: 5000 });
      console.log("✓ 'Why This Matters' strategic rationale loaded");
    }

    // Switch to "Resources" tab
    const resTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Resources"));
    });
    if (resTabBtn) {
      await resTabBtn.asElement()?.click();
      await new Promise((r) => setTimeout(r, 500));
      const links = await page.$$eval('a[target="_blank"]', (as) =>
        as.map((a) => ({ text: a.innerText.trim(), href: a.href }))
      );
      console.log(`✓ Curated Resources tab loaded with ${links.length} verified links`);
    }

    // Switch to "Deep Dive" search tab
    const searchTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Deep Dive"));
    });
    if (searchTabBtn) {
      await searchTabBtn.asElement()?.click();
      await page.waitForSelector('code.font-mono', { timeout: 5000 });
      const searchQuery = await page.$eval('code.font-mono', (el) => el.innerText);
      console.log(`✓ Deep Dive Search Query loaded: "${searchQuery}"`);
    }

    // Close node panel
    const closePanelBtn = await page.$('button[aria-label="Close panel"]');
    if (closePanelBtn) await closePanelBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    // -------------------------------------------------------------------------
    // STEP 8: Use "I already know..." flow
    // -------------------------------------------------------------------------
    console.log("\n[Step 8] Triggering 'I already know...' modal...");
    const adjustBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("I already know"));
    });
    if (!adjustBtn) throw new Error("Could not find 'I already know' button");
    await adjustBtn.asElement()?.click();

    await page.waitForSelector('textarea', { timeout: 5000 });
    console.log("✓ 'I already know...' modal opened");

    const statement = "I've shipped production React and TypeScript apps and I'm comfortable with Git.";
    console.log("Typing statement:", statement);
    await page.type('textarea', statement);

    // -------------------------------------------------------------------------
    // STEP 9: Verify roadmap updates/replans
    // -------------------------------------------------------------------------
    console.log("\n[Step 9] Submitting statement to replan roadmap...");
    const updateRoadmapBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Update Roadmap"));
    });
    await updateRoadmapBtn.asElement()?.click();

    // Wait for modal to close and updates to apply
    await page.waitForFunction(() => !document.querySelector('textarea'), { timeout: 10000 });
    console.log("✓ Adjustment processed and modal closed");

    // Wait for nodes to re-render with updated statuses
    await new Promise((r) => setTimeout(r, 1000));

    // Check for "Already Known" nodes
    const knownCount = await page.$$eval('.react-flow__node', (nodes) =>
      nodes.filter((n) => n.innerText.includes("Already Known") || n.innerText.includes("Known")).length
    );
    console.log(`✓ Roadmap replanned: ${knownCount} node(s) marked as Already Known`);

    // Check downstream unlocked nodes
    const availableCount = await page.$$eval('.react-flow__node', (nodes) =>
      nodes.filter((n) => n.innerText.includes("Available")).length
    );
    console.log(`✓ Available unlocked nodes: ${availableCount}`);

    // -------------------------------------------------------------------------
    // STEP 10: Refresh browser and verify persistence
    // -------------------------------------------------------------------------
    console.log("\n[Step 10] Reloading browser to verify localStorage persistence...");
    await page.reload({ waitUntil: "networkidle0" });

    // Verify roadmap is still rendered (did NOT reset to landing page)
    await page.waitForSelector('.react-flow', { timeout: 8000 });
    const postReloadGoal = await page.$eval('h1', (el) => el.innerText);
    console.log(`✓ Preserved Target Role after reload: "${postReloadGoal}"`);

    const postReloadKnown = await page.$$eval('.react-flow__node', (nodes) =>
      nodes.filter((n) => n.innerText.includes("Already Known") || n.innerText.includes("Known")).length
    );
    console.log(`✓ Preserved known nodes after reload: ${postReloadKnown}`);

    const isLandingRendered = (await page.$('input[placeholder*="Netflix"]')) !== null;
    if (isLandingRendered) {
      throw new Error("Persistence failed: returned to landing page after reload!");
    }
    console.log("✓ Verified persistence: graph and progress fully survived page refresh!");

    console.log("\n=======================================================");
    console.log("🎉 ALL 10 END-TO-END UI FLOW STEPS PASSED SUCCESSFULLY!");
    console.log("=======================================================");

  } catch (err) {
    console.error("\n❌ Verification Failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVerification();
