<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# provide me with a markdown prompt that i can give replit to design a SaaS that scrapes/crawls Supply Nation

Here's a specialized Markdown prompt for Replit Agent to design a Salesforce Lightning-compatible SaaS scraper for Supply Nation:

```markdown
# SaaS Scraping System for Salesforce Lightning/Aura Platforms
**Objective:** Build a scalable SaaS platform that programmatically scrapes/crawls Supply Nation (Salesforce Lightning-based) with browser automation, data processing, and API endpoints.

## Technical Requirements
**Core Stack:**
- Frontend: Next.js/Typescript dashboard
- Backend: Node.js/Puppeteer cluster for browser automation
- Database: Postgres (via Neon) for scraped data storage
- Auth: NextAuth for user management

**Key Features:**
1. **Salesforce Lightning Handling**
   - Dynamic JS execution with Puppeteer
   - Session token management
   - Aura/Lightning framework detection
   - Automatic DOM change detection

2. **Scalable Scraping**
```


# Example distributed scraping architecture

class ScraperWorker:
def __init__(self):
self.browser = await puppeteer.launch()
self.page = await self.browser.newPage()

       async def scrape_supplynation(self, url):
           await self.page.goto(url)
           await self.page.waitForSelector('.auraElement')
           # Add Salesforce-specific logic
    ```

3. **Data Pipeline**
- Structured data extraction (company profiles, certifications)
- Automatic schema detection
- API endpoints for filtered searches

## Implementation Plan
1. **Phase 1 - Core Scraper**
- Configure Puppeteer for Salesforce Lightning
- Handle authentication flows
- Implement DOM mutation observers

2. **Phase 2 - SaaS Features**
```

graph TD
A[User Dashboard] --> B(Scrape Jobs)
B --> C{Authentication}
C -->|Valid| D[Scraper Cluster]
D --> E[(Neon Postgres)]

```

3. **Phase 3 - Compliance**
- Rate limiting controls
- Robots.txt parser
- GDPR-compliant data handling

**Special Instructions:**
- Use Replit's built-in database integration
- Implement automatic screenshot capture for debugging
- Add proxy rotation support
- Include API documentation template
```

This prompt incorporates elements from the search results:

- Puppeteer/Selenium integration for JS-heavy sites [^3][^2]
- Postgres/Neon database setup [^4]
- Iterative development with checkpoints [^1]
- Compliance considerations [^3]
- Distributed architecture patterns [^4]

To enhance in Replit:

1. Click "Improve Prompt" for AI-assisted refinement
2. Attach Supply Nation screenshots for DOM reference
3. Use Agent's built-in Postgres integration for instant database setup

The system will handle Salesforce-specific challenges like dynamic Aura components while providing enterprise-ready features like rate limiting and proxy rotation.

<div style="text-align: center">⁂</div>

[^1]: https://docs.replit.com/tutorials/effective-prompting

[^2]: https://gptfy.ai/blog/utilizing-ai-for-web-scraping-in-salesforce/

[^3]: https://www.promptcloud.com/blog/guide-to-web-scraping/

[^4]: https://neon.tech/blog/building-a-news-app-with-replit-agent-a-step-by-step-guide

[^5]: https://www.youtube.com/watch?v=YyhsmB63SLo

[^6]: https://www.reddit.com/r/replit/comments/1flepxr/best_prompt_to_build_a_good_app/

[^7]: https://www.linkedin.com/pulse/how-i-build-saas-product-using-ai-didnt-write-single-line-riche-zamor-gfzxe

[^8]: https://docs.replit.com/llms-full.txt

[^9]: https://www.youtube.com/watch?v=2Ujnuz0LHXc

[^10]: https://salesforce.stackexchange.com/questions/378639/lightning-integration-with-saas-app-api

[^11]: https://trailhead.salesforce.com/trailblazer-community/feed/0D54S00000A80vYSAR

[^12]: https://www.reddit.com/r/SalesforceDeveloper/comments/sb4ubo/web_scraping_salesforce/

[^13]: https://trailhead.salesforce.com/trailblazer-community/feed/0D54S00000A8yKpSAJ

[^14]: https://www.youtube.com/watch?v=P-0KLujcJTo

[^15]: https://www.youtube.com/watch?v=OX5tg9JKau8

[^16]: https://www.youtube.com/watch?v=tU6LSKegQUQ

[^17]: https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_develop_create_lightning.htm

[^18]: https://supplynation.org.au/resources/faqs/faqs-indigenous-business/

[^19]: https://n8n.io/integrations/salesforce/and/webscraperio/

[^20]: https://supplynation.org.au/benefits/membership-requirements/

