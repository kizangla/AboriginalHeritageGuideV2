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
  // Enriched cultural data
  kinshipSystem: string;
  moietySystem: string;
  skinNames: string[];
  traditionalGovernance: string;
  elderStructure: string;
  environmentalKnowledge: string;
  landManagement: string;
  waterKnowledge: string;
  tradeNetworks: string;
  neighboringGroups: string[];
  tradeGoods: string[];
  musicInstruments: string[];
  danceStyles: string[];
  storytellingTraditions: string;
  toolsTechnology: string[];
  weavingTextiles: string[];
  significantSites: string[];
  dreamtimeBeings: string[];
  contemporaryCulture: string;
  languageRevival: string;
  culturalCentres: string[];
  notableFigures: string[];
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
        // Enriched data
        kinshipSystem: cached.kinshipSystem || "",
        moietySystem: cached.moietySystem || "",
        skinNames: cached.skinNames || [],
        traditionalGovernance: cached.traditionalGovernance || "",
        elderStructure: cached.elderStructure || "",
        environmentalKnowledge: cached.environmentalKnowledge || "",
        landManagement: cached.landManagement || "",
        waterKnowledge: cached.waterKnowledge || "",
        tradeNetworks: cached.tradeNetworks || "",
        neighboringGroups: cached.neighboringGroups || [],
        tradeGoods: cached.tradeGoods || [],
        musicInstruments: cached.musicInstruments || [],
        danceStyles: cached.danceStyles || [],
        storytellingTraditions: cached.storytellingTraditions || "",
        toolsTechnology: cached.toolsTechnology || [],
        weavingTextiles: cached.weavingTextiles || [],
        significantSites: cached.significantSites || [],
        dreamtimeBeings: cached.dreamtimeBeings || [],
        contemporaryCulture: cached.contemporaryCulture || "",
        languageRevival: cached.languageRevival || "",
        culturalCentres: cached.culturalCentres || [],
        notableFigures: cached.notableFigures || [],
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
        modelUsed: "gpt-4o",
        // Enriched data
        kinshipSystem: content.kinshipSystem,
        moietySystem: content.moietySystem,
        skinNames: content.skinNames,
        traditionalGovernance: content.traditionalGovernance,
        elderStructure: content.elderStructure,
        environmentalKnowledge: content.environmentalKnowledge,
        landManagement: content.landManagement,
        waterKnowledge: content.waterKnowledge,
        tradeNetworks: content.tradeNetworks,
        neighboringGroups: content.neighboringGroups,
        tradeGoods: content.tradeGoods,
        musicInstruments: content.musicInstruments,
        danceStyles: content.danceStyles,
        storytellingTraditions: content.storytellingTraditions,
        toolsTechnology: content.toolsTechnology,
        weavingTextiles: content.weavingTextiles,
        significantSites: content.significantSites,
        dreamtimeBeings: content.dreamtimeBeings,
        contemporaryCulture: content.contemporaryCulture,
        languageRevival: content.languageRevival,
        culturalCentres: content.culturalCentres,
        notableFigures: content.notableFigures,
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

    const prompt = `You are a respectful cultural researcher helping document Aboriginal Australian territories. Research and provide comprehensive, culturally-sensitive information about the "${territoryName}" Aboriginal territory in ${region}, ${stateContext}.

IMPORTANT GUIDELINES:
- Be respectful and acknowledge Traditional Owners
- Use "may" and "traditionally" when discussing practices that aren't definitively documented
- Focus on publicly available, non-sacred information
- Acknowledge when information is uncertain
- Do NOT make up specific sacred or ceremonial details
- Provide rich, educational content while respecting cultural boundaries

Please provide comprehensive information in this exact JSON format:
{
  "languageFamily": "The linguistic group (e.g., Pama-Nyungan, Non-Pama-Nyungan). If unknown, say 'Research pending'",
  "traditionalLanguages": ["Language names spoken in this territory, include dialects if known"],
  "culturalPractices": "A detailed paragraph about documented cultural practices, connection to country, and living traditions.",
  "historicalContext": "A paragraph covering pre-colonial life, impacts of colonisation, resistance movements, and contemporary cultural continuation.",
  "connectionToCountry": "A paragraph about spiritual and practical connections to traditional lands, including the concept of Country.",
  "traditionalPractices": ["List 5-7 traditional practices: hunting, gathering, ceremony, art-making, fire management, etc."],
  "artStyles": ["List 3-5 art forms: rock art, bark painting, dot painting, weaving, body painting, etc."],
  "ceremonies": ["List 3-4 ceremony types using general terms: initiation, seasonal, healing, corroboree"],
  "songlines": ["2-3 general descriptions of songline traditions and how they connect territories"],
  "traditionalFoods": ["List 6-8 bush tucker foods specific to this region's environment"],
  "seasonalCalendar": "Describe the traditional 4-6 season calendar and how it relates to food, water, and ceremony",
  
  "kinshipSystem": "Describe the kinship structure and how it organizes social relationships and responsibilities",
  "moietySystem": "Explain the moiety system if applicable (e.g., Eaglehawk/Crow) and its role in marriage and ceremony",
  "skinNames": ["List 4-8 skin names or section names if known for this group"],
  "traditionalGovernance": "Explain traditional leadership and decision-making structures",
  "elderStructure": "Describe the role of Elders in maintaining law, culture, and knowledge transmission",
  
  "environmentalKnowledge": "Describe traditional ecological knowledge and understanding of the natural world",
  "landManagement": "Explain traditional land management practices including fire management (cultural burning)",
  "waterKnowledge": "Describe knowledge of water sources, rain-making, and water management",
  
  "tradeNetworks": "Describe traditional trade routes and exchange relationships with neighboring groups",
  "neighboringGroups": ["List 3-5 neighboring Aboriginal groups this territory traditionally interacted with"],
  "tradeGoods": ["List 4-6 items traditionally traded: ochre, stone tools, shells, foodstuffs, etc."],
  
  "musicInstruments": ["List 3-5 traditional instruments: didgeridoo/yidaki, clapsticks, rhythm sticks, drums"],
  "danceStyles": ["List 2-4 dance traditions or corroboree styles"],
  "storytellingTraditions": "Describe oral traditions, story-keeping, and knowledge transmission practices",
  
  "toolsTechnology": ["List 5-7 traditional tools: boomerangs, woomeras, coolamons, grinding stones, fish traps"],
  "weavingTextiles": ["List 2-4 weaving and textile traditions: dilly bags, baskets, nets, mats"],
  
  "significantSites": ["List 3-5 types of significant places (not specific locations): meeting grounds, water sources, ochre deposits"],
  "dreamtimeBeings": ["List 2-4 publicly known ancestral beings associated with this region, use general terms"],
  
  "contemporaryCulture": "Describe contemporary cultural practices, keeping culture strong, and cultural revival efforts",
  "languageRevival": "Describe language preservation and revival programs if known",
  "culturalCentres": ["List any known cultural centres, art centres, or keeping places in the region"],
  "notableFigures": ["List 2-4 notable historical or contemporary figures from this group who are publicly known"],
  
  "sourcesUsed": ["List source types: AIATSIS, Native Title records, cultural centres, published research, community websites"]
}

Respond ONLY with valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a respectful cultural researcher specializing in Aboriginal Australian cultures. You provide accurate, comprehensive, and culturally-sensitive information while acknowledging the limits of publicly available knowledge and always respecting sacred/secret information boundaries. You draw on publicly available sources including AIATSIS, Native Title records, cultural centre publications, academic research, and community-shared knowledge."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
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
      // Enriched data
      kinshipSystem: parsed.kinshipSystem || "",
      moietySystem: parsed.moietySystem || "",
      skinNames: parsed.skinNames || [],
      traditionalGovernance: parsed.traditionalGovernance || "",
      elderStructure: parsed.elderStructure || "",
      environmentalKnowledge: parsed.environmentalKnowledge || "",
      landManagement: parsed.landManagement || "",
      waterKnowledge: parsed.waterKnowledge || "",
      tradeNetworks: parsed.tradeNetworks || "",
      neighboringGroups: parsed.neighboringGroups || [],
      tradeGoods: parsed.tradeGoods || [],
      musicInstruments: parsed.musicInstruments || [],
      danceStyles: parsed.danceStyles || [],
      storytellingTraditions: parsed.storytellingTraditions || "",
      toolsTechnology: parsed.toolsTechnology || [],
      weavingTextiles: parsed.weavingTextiles || [],
      significantSites: parsed.significantSites || [],
      dreamtimeBeings: parsed.dreamtimeBeings || [],
      contemporaryCulture: parsed.contemporaryCulture || "",
      languageRevival: parsed.languageRevival || "",
      culturalCentres: parsed.culturalCentres || [],
      notableFigures: parsed.notableFigures || [],
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
