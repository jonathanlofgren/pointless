import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createRoom(page: Page): Promise<string> {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Create Session" }).click();
  await page.waitForURL(/\/room\//);
  return page.url().split("?")[0];
}

async function joinRoom(page: Page, name: string) {
  const input = page.getByPlaceholder("Enter your name");
  await input.pressSequentially(name);
  await input.press("Enter");
  await expect(page.locator("aside")).toBeVisible();
}

async function addStory(page: Page, title: string) {
  const input = page.getByPlaceholder("Add a story...");
  await input.fill(title);
  await input.press("Enter");
  await expect(page.locator("aside")).toContainText(title);
}

async function voteCard(page: Page, value: string) {
  await page.getByRole("button", { name: value, exact: true }).first().click();
}

async function revealCards(page: Page) {
  await page.getByRole("button", { name: "Reveal Cards" }).click();
  await expect(page.locator("main")).toContainText("Votes revealed!");
}

async function setEstimate(page: Page, value: string) {
  await page
    .locator("text=Set estimate")
    .locator("..")
    .getByRole("button", { name: value, exact: true })
    .click();
  await expect(page.locator("main")).toContainText("Agreed Estimate");
}

async function interceptClipboard(page: Page) {
  await page.evaluate(() => {
    (window as any).__clip = "";
    navigator.clipboard.writeText = async (t: string) => {
      (window as any).__clip = t;
    };
  });
}

async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__clip);
}

/** Open a second tab as a new player in the same room. */
async function joinAsSecondPlayer(
  context: BrowserContext,
  roomUrl: string,
  name: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(roomUrl);
  await joinRoom(page, name);
  return page;
}

/** Complete a full vote-reveal-estimate cycle on a single-player room. */
async function completeStory(page: Page, voteValue: string, estimateValue: string) {
  await voteCard(page, voteValue);
  await revealCards(page);
  await setEstimate(page, estimateValue);
}

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

test.describe("Home Page", () => {
  test("renders and creates a session with fibonacci", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pointless" })).toBeVisible();
    await page.getByRole("button", { name: "Create Session" }).click();
    await page.waitForURL(/\/room\//);
    expect(page.url()).toMatch(/\/room\/.+\?scale=fibonacci/);
  });

  test("can select a different scale", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /T-Shirt/ }).click();
    await page.getByRole("button", { name: "Create Session" }).click();
    await page.waitForURL(/\/room\//);
    expect(page.url()).toContain("scale=tshirt");
  });
});

// ---------------------------------------------------------------------------
// Single-Player Room
// ---------------------------------------------------------------------------

test.describe("Room — Single Player", () => {
  test("shows name entry form on join", async ({ page }) => {
    await createRoom(page);
    await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
  });

  test("joins room and shows player", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await expect(page.locator("main")).toContainText("Alice (you)");
    await expect(page.locator("header")).toContainText("1 player");
  });

  test("pre-fills name from previous session", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");

    // Create a new room without clearing localStorage (simulates returning user)
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/");
    await page.getByRole("button", { name: "Create Session" }).click();
    await page.waitForURL(/\/room\//);

    const input = page.getByPlaceholder("Enter your name");
    await expect(input).toHaveValue("Alice");
  });

  test("sidebar shows correct sections", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Auth flow");
    await addStory(page, "Dashboard");

    const sidebar = page.locator("aside");
    await expect(sidebar).toContainText("Now Estimating");
    await expect(sidebar).toContainText("Auth flow");
    await expect(sidebar).toContainText("Up Next (1)");
    await expect(sidebar).toContainText("Dashboard");
  });

  test("blocks duplicate story names", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Auth flow");

    const input = page.getByPlaceholder("Add a story...");
    await input.fill("Auth flow");
    await input.press("Enter");
    await expect(page.locator("aside")).toContainText(
      "A story with that name already exists"
    );
  });

  test("vote selects card and shows voted count", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    await voteCard(page, "5");
    await expect(page.locator("main")).toContainText("Vote cast!");
    await expect(page.locator("main")).toContainText("1/1 voted");
  });

  test("can change vote before reveal", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    await voteCard(page, "5");
    await expect(page.locator("main")).toContainText("Vote cast!");

    // Change vote to 8
    await voteCard(page, "8");
    await expect(page.locator("main")).toContainText("Vote cast!");

    // Reveal — should show 8, not 5
    await revealCards(page);
    await expect(page.locator("main")).toContainText("Average: 8.0");
  });

  test("reveal button disabled with no votes", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    const revealBtn = page.getByRole("button", { name: "Reveal Cards" });
    await expect(revealBtn).toBeDisabled();
  });

  test("reveal shows votes and average", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");
    await voteCard(page, "5");
    await revealCards(page);

    await expect(page.locator("main")).toContainText("Average: 5.0");
    await expect(page.locator("main")).toContainText("Set estimate");
  });

  test("re-vote clears card selection", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");
    await voteCard(page, "8");
    await revealCards(page);

    await page.getByRole("button", { name: "Re-vote" }).click();
    await expect(page.locator("main")).toContainText("Pick your estimate");
    await expect(page.locator("button.-translate-y-2")).toHaveCount(0);
  });

  test("set estimate shows confirmation then auto-advances", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Story A");
    await addStory(page, "Story B");

    await completeStory(page, "3", "3");

    await expect(page.locator("main")).toContainText("Moving to next story");

    // Auto-advances to Story B
    await expect(page.locator("main h2")).toContainText("Story B", { timeout: 5000 });
    await expect(page.locator("aside")).toContainText("Completed (1)");
  });

  test("all stories completed shows empty state", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Only story");

    await completeStory(page, "5", "5");

    // After auto-advance with no remaining stories
    await expect(page.locator("main")).toContainText("Add a story to start estimating", {
      timeout: 5000,
    });
    await expect(page.locator("aside")).toContainText("Completed (1)");
    await expect(page.locator("aside")).not.toContainText("Now Estimating");
    await expect(page.locator("aside")).not.toContainText("Up Next");
  });

  test("completed story view shows estimate and re-estimate option", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Story A");
    await completeStory(page, "5", "5");

    // Wait for auto-advance, then click completed story
    await expect(page.locator("main")).toContainText("Add a story", { timeout: 5000 });
    await page.locator("aside").getByText("Story A").click();

    await expect(page.locator("main")).toContainText("Estimated");
    await expect(page.locator("main")).toContainText("5");
    await expect(page.locator("main")).toContainText("Re-estimate");
    await expect(page.locator("main")).toContainText("Back to voting");
  });

  test("re-estimate moves story back to voting", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Story A");
    await completeStory(page, "5", "5");

    await expect(page.locator("main")).toContainText("Add a story", { timeout: 5000 });
    await page.locator("aside").getByText("Story A").click();

    await page.getByRole("button", { name: "Re-estimate this story" }).click();
    await expect(page.locator("main")).toContainText("Pick your estimate");
    await expect(page.locator("aside")).toContainText("Now Estimating");
  });

  test("bulk import adds multiple stories", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");

    // Open dropdown and click Bulk Import
    await page.locator('button[title="More options"]').click();
    await page.getByText("Bulk Import").click();

    // Paste multiple stories
    const textarea = page.getByPlaceholder("Paste stories here, one per line...");
    await expect(textarea).toBeVisible();
    await textarea.fill("Auth flow\nDashboard redesign\nPayment integration");

    // Verify count
    await expect(page.locator("text=3 stories to import")).toBeVisible();

    // Submit
    await page.getByRole("button", { name: /Import 3 stories/ }).click();

    // Verify all stories appear in sidebar
    const sidebar = page.locator("aside");
    await expect(sidebar).toContainText("Auth flow");
    await expect(sidebar).toContainText("Dashboard redesign");
    await expect(sidebar).toContainText("Payment integration");

    // First story should be auto-selected
    await expect(sidebar).toContainText("Now Estimating");
  });

  test("remove story from sidebar", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Story A");
    await addStory(page, "Story B");

    const storyB = page.locator("aside").getByText("Story B");
    await storyB.hover();
    await storyB.locator("..").getByTitle("Remove story").click();

    await expect(page.locator("aside")).not.toContainText("Story B");
  });
});

// ---------------------------------------------------------------------------
// Multiplayer
// ---------------------------------------------------------------------------

test.describe("Room — Multiplayer", () => {
  test("two players see each other", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    await expect(page.locator("main")).toContainText("Bob");
    await expect(page2.locator("main")).toContainText("Alice");
    await expect(page.locator("header")).toContainText("2 player");
    await page2.close();
  });

  test("votes are hidden until reveal", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    // Alice votes 13
    await voteCard(page, "13");
    await page.waitForTimeout(300);

    // Bob's player indicator area should show a checkmark, not the value
    const bobPlayerCards = page2.locator("main").locator("div.flex.flex-col.items-center.gap-2 > div:first-child");
    const indicators = await bobPlayerCards.allTextContents();
    expect(indicators).toContain("✓");
    expect(indicators).not.toContain("13");

    await page2.close();
  });

  test("reveal syncs votes to both players", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    await voteCard(page, "5");
    await voteCard(page2, "8");
    await expect(page.locator("main")).toContainText("2/2 voted");

    await revealCards(page);

    await expect(page.locator("main")).toContainText("Average");
    await expect(page2.locator("main")).toContainText("Votes revealed!");
    await page2.close();
  });

  test("agreed estimate and auto-advance sync to both", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Story A");
    await addStory(page, "Story B");

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    await voteCard(page, "5");
    await voteCard(page2, "3");
    await revealCards(page);
    await setEstimate(page, "5");

    await expect(page2.locator("main")).toContainText("Agreed Estimate");

    // Both auto-advance to Story B
    await expect(page.locator("main h2")).toContainText("Story B", { timeout: 5000 });
    await expect(page2.locator("main h2")).toContainText("Story B", { timeout: 5000 });
    await page2.close();
  });

  test("any player can add stories", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    await addStory(page2, "Bob's story");
    await expect(page.locator("aside")).toContainText("Bob's story");
    await page2.close();
  });
});

// ---------------------------------------------------------------------------
// Export & Results
// ---------------------------------------------------------------------------

test.describe("Export & Results", () => {
  test("export generates a working results URL", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");
    await completeStory(page, "5", "5");

    await expect(page.locator("main")).toContainText("Add a story", { timeout: 5000 });

    await interceptClipboard(page);
    await page.locator("button", { hasText: "Export Results" }).click();

    const url = await readClipboard(page);
    expect(url).toContain("/results#");

    await page.goto(url);
    await expect(page.locator("body")).toContainText("Session Results");
    await expect(page.locator("body")).toContainText("Test story");
    await expect(page.locator("body")).toContainText("5");
    await expect(page.locator("body")).toContainText("Alice");
  });

  test("results page shows error for invalid data", async ({ page }) => {
    await page.goto("/results#garbage-data-here");
    await expect(page.locator("body")).toContainText("Failed to decode results");
    await expect(page.getByText("Create a new session")).toBeVisible();
  });

  test("results page shows error for empty hash", async ({ page }) => {
    await page.goto("/results");
    await expect(page.locator("body")).toContainText("No results data");
  });
});

// ---------------------------------------------------------------------------
// Owner Permissions
// ---------------------------------------------------------------------------

test.describe("Room — Owner Permissions", () => {
  test("non-owner cannot see reveal, re-vote, set estimate, or delete buttons", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Test story");

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    // Both vote
    await voteCard(page2, "5");
    await voteCard(page, "8");
    await expect(page.locator("main")).toContainText("2/2 voted");

    // Bob should NOT see the Reveal Cards button
    await expect(page2.locator("main")).toContainText("2/2 voted");
    await expect(page2.getByRole("button", { name: "Reveal Cards" })).toHaveCount(0);

    // Alice reveals
    await revealCards(page);

    // Bob should NOT see Re-vote or Set estimate
    await expect(page2.locator("main")).toContainText("Votes revealed!");
    await expect(page2.getByRole("button", { name: "Re-vote" })).toHaveCount(0);
    await expect(page2.locator("main")).not.toContainText("Set estimate");

    // Bob should NOT see delete button on story hover
    const storyItem = page2.locator("aside").getByText("Test story");
    await storyItem.hover();
    await expect(page2.locator('button[title="Remove story"]')).toHaveCount(0);

    await page2.close();
  });

  test("non-owner cannot see re-estimate button on completed story", async ({ page, context }) => {
    const roomUrl = await createRoom(page);
    await joinRoom(page, "Alice");
    await addStory(page, "Story A");
    await completeStory(page, "5", "5");

    // Wait for auto-advance
    await expect(page.locator("main")).toContainText("Add a story", { timeout: 5000 });

    const page2 = await joinAsSecondPlayer(context, roomUrl, "Bob");

    // Bob clicks completed story
    await page2.locator("aside").getByText("Story A").click();
    await expect(page2.locator("main")).toContainText("Estimated");
    await expect(page2.getByRole("button", { name: "Re-estimate this story" })).toHaveCount(0);

    // Alice should still see re-estimate
    await page.locator("aside").getByText("Story A").click();
    await expect(page.getByRole("button", { name: "Re-estimate this story" })).toBeVisible();

    await page2.close();
  });
});

// ---------------------------------------------------------------------------
// UI Features
// ---------------------------------------------------------------------------

test.describe("UI Features", () => {
  test("QR code popover opens and dismisses", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");

    await page.locator('button[title="Show QR code"]').click();
    await expect(page.locator("text=Scan to join")).toBeVisible();

    // Dismiss by clicking overlay
    await page.locator(".fixed.inset-0.z-40").click();
    await expect(page.locator("text=Scan to join")).not.toBeVisible();
  });

  test("copy invite link", async ({ page }) => {
    await createRoom(page);
    await joinRoom(page, "Alice");

    await interceptClipboard(page);
    await page.getByRole("button", { name: "Copy Invite Link" }).click();
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();

    const url = await readClipboard(page);
    expect(url).toMatch(/\/room\/.+/);
  });
});
