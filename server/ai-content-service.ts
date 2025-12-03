import OpenAI from "openai";
import { db } from "./db";
import { aiTerritoryContent, type AITerritoryContent, type InsertAITerritoryContent } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface AIGeneratedContent {
  languageFamily: string;
  traditionalLanguages: string[];
  culturalPractices: string;
  historicalContext: string;
  connectionToCountry: string;
  traditionalPractices: string[];
  artStyles: string[];
  ceremonies: string[];
  songlines: string[];
  traditionalFoods: string[];
  seasonalCalendar: string;
  sourcesUsed: string[];
  isAIGenerated: boolean;
  generatedAt: string;
}

export async function getAITerritoryContent(
  territoryName: string,
  region: string,
  centerLat: number,
  centerLng: number
): Promise<AIGeneratedContent | null> {
  try {
    const [cached] = await db
      .select()
      .from(aiTerritoryContent)
      .where(eq(aiTerritoryContent.territoryName, territoryName));

    if (cached) {
      console.log(`Using cached AI content for ${territoryName}`);
      return {
        languageFamily: cached.languageFamily || "",
        traditionalLanguages: cached.traditionalLanguages || [],
        culturalPractices: cached.culturalPractices || "",
        historicalContext: cached.historicalContext || "",
        connectionToCountry: cached.connectionToCountry || "",
        traditionalPractices: cached.traditionalPractices || [],
        artStyles: cached.artStyles || [],
        ceremonies: cached.ceremonies || [],
        songlines: cached.songlines || [],
        traditionalFoods: cached.traditionalFoods || [],
        seasonalCalendar: cached.seasonalCalendar || "",
        sourcesUsed: cached.sourcesUsed || [],
        isAIGenerated: true,
        generatedAt: cached.generatedAt,
      };
    }

    console.log(`Generating AI content for ${territoryName}...`);
    const content = await generateTerritoryContent(territoryName, region, centerLat, centerLng);

    if (content) {
      const insertData: InsertAITerritoryContent = {
        territoryName,
        languageFamily: content.languageFamily,
        traditionalLanguages: content.traditionalLanguages,
        culturalPractices: content.culturalPractices,
        historicalContext: content.historicalContext,
        connectionToCountry: content.connectionToCountry,
        traditionalPractices: content.traditionalPractices,
        artStyles: content.artStyles,
        ceremonies: content.ceremonies,
        songlines: content.songlines,
        traditionalFoods: content.traditionalFoods,
        seasonalCalendar: content.seasonalCalendar,
        sourcesUsed: content.sourcesUsed,
        generatedAt: new Date().toISOString(),
        modelUsed: "gpt-4o-mini",
      };

      await db.insert(aiTerritoryContent).values(insertData);
      console.log(`Cached AI content for ${territoryName}`);
    }

    return content;
  } catch (error) {
    console.error(`Error getting AI content for ${territoryName}:`, error);
    return null;
  }
}

async function generateTerritoryContent(
  territoryName: string,
  region: string,
  lat: number,
  lng: number
): Promise<AIGeneratedContent | null> {
  try {
    const stateContext = getStateFromCoordinates(lat, lng);

    const prompt = `You are a respectful cultural researcher helping document Aboriginal Australian territories. Research and provide accurate, culturally-sensitive information about the "${territoryName}" Aboriginal territory in ${region}, ${stateContext}.

IMPORTANT GUIDELINES:
- Be respectful and acknowledge Traditional Owners
- Use "may" and "traditionally" when discussing practices that aren't definitively documented
- Focus on publicly available, non-sacred information
- Acknowledge when information is uncertain
- Do NOT make up specific sacred or ceremonial details

Please provide information in this exact JSON format:
{
  "languageFamily": "The linguistic group or language family this territory belongs to (e.g., Pama-Nyungan, Non-Pama-Nyungan). If unknown, say 'Research pending'",
  "traditionalLanguages": ["List of language names traditionally spoken in this territory. Include dialect variations if known. If unknown, include the territory name as a likely language name"],
  "culturalPractices": "A paragraph describing documented cultural practices, connection to country, and traditions. Be respectful and focus on publicly shared knowledge.",
  "historicalContext": "A paragraph about the historical context, including pre-colonial life, impacts of colonisation, and contemporary cultural continuation.",
  "connectionToCountry": "A paragraph about the spiritual and practical connection the people have to their traditional lands.",
  "traditionalPractices": ["List 3-5 general traditional practices like hunting, gathering, ceremony, art-making"],
  "artStyles": ["List 2-4 art styles associated with this region, like rock art, dot painting, weaving"],
  "ceremonies": ["List 2-3 types of ceremonies that may be practiced, using general terms like 'initiation ceremonies', 'seasonal ceremonies'"],
  "songlines": ["List 1-2 general descriptions of songline connections, NOT specific sacred details"],
  "traditionalFoods": ["List 4-6 bush tucker foods traditionally gathered in this region based on the environment"],
  "seasonalCalendar": "Describe the traditional seasonal calendar and how it relates to resource gathering and ceremony",
  "sourcesUsed": ["List 2-3 general source types like 'AIATSIS records', 'Native Title determinations', 'Regional cultural centres'"]
}

Respond ONLY with valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a respectful cultural researcher specializing in Aboriginal Australian cultures. You provide accurate, culturally-sensitive information while acknowledging the limits of publicly available knowledge and respecting sacred/secret information boundaries."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) {
      console.error("Empty response from OpenAI");
      return null;
    }

    const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanedResponse);

    return {
      languageFamily: parsed.languageFamily || "Research pending",
      traditionalLanguages: parsed.traditionalLanguages || [territoryName],
      culturalPractices: parsed.culturalPractices || "",
      historicalContext: parsed.historicalContext || "",
      connectionToCountry: parsed.connectionToCountry || "",
      traditionalPractices: parsed.traditionalPractices || [],
      artStyles: parsed.artStyles || [],
      ceremonies: parsed.ceremonies || [],
      songlines: parsed.songlines || [],
      traditionalFoods: parsed.traditionalFoods || [],
      seasonalCalendar: parsed.seasonalCalendar || "",
      sourcesUsed: parsed.sourcesUsed || ["AI-researched content"],
      isAIGenerated: true,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating AI content:", error);
    return null;
  }
}

function getStateFromCoordinates(lat: number, lng: number): string {
  if (lat >= -35 && lat <= -13 && lng >= 113 && lng <= 129) return "Western Australia";
  if (lat >= -29 && lat <= -9 && lng >= 138 && lng <= 154) return "Queensland";
  if (lat >= -37 && lat <= -28 && lng >= 141 && lng <= 154) return "New South Wales";
  if (lat >= -39 && lat <= -34 && lng >= 141 && lng <= 150) return "Victoria";
  if (lat >= -38 && lat <= -26 && lng >= 129 && lng <= 141) return "South Australia";
  if (lat >= -43 && lat <= -39 && lng >= 144 && lng <= 149) return "Tasmania";
  if (lat >= -26 && lat <= -10 && lng >= 129 && lng <= 138) return "Northern Territory";
  return "Australia";
}

export async function clearAIContentCache(territoryName?: string): Promise<void> {
  if (territoryName) {
    await db.delete(aiTerritoryContent).where(eq(aiTerritoryContent.territoryName, territoryName));
    console.log(`Cleared AI content cache for ${territoryName}`);
  } else {
    await db.delete(aiTerritoryContent);
    console.log("Cleared all AI content cache");
  }
}
