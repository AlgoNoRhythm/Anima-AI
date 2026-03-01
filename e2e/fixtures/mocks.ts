import type { Page, Route } from '@playwright/test';

export async function setupLLMMock(page: Page) {
  // Intercept OpenAI API calls
  await page.route('**/api.openai.com/**', async (route: Route) => {
    const request = route.request();
    const url = request.url();

    if (url.includes('/chat/completions')) {
      // Return a canned streaming response
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'data: {"choices":[{"delta":{"content":"This is a "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"test response."}}]}\n\n',
          'data: [DONE]\n\n',
        ].join(''),
      });
    } else {
      await route.continue();
    }
  });

  // Intercept Anthropic API calls
  await page.route('**/api.anthropic.com/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        'data: {"type":"content_block_delta","delta":{"text":"Mock Anthropic response."}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ].join(''),
    });
  });
}

export async function setupDoclingMock(page: Page) {
  await page.route('**/localhost:8000/parse', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pages: [
          {
            page_number: 1,
            sections: [
              { title: 'Introduction', text: 'This is the dishwasher manual.', bbox: null },
              { title: 'Safety', text: 'Always unplug before maintenance.', bbox: null },
            ],
            tables: [],
          },
          {
            page_number: 2,
            sections: [
              { title: 'Maintenance', text: 'Clean the filter monthly. Remove the filter and rinse under running water.', bbox: null },
            ],
            tables: [
              { markdown: '| Part | Frequency |\n|---|---|\n| Filter | Monthly |\n| Spray Arms | Quarterly |', bbox: null },
            ],
          },
        ],
        total_pages: 2,
        filename: 'sample.pdf',
      }),
    });
  });
}
