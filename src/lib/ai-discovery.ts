import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export type DiscoveredProduct = {
  name: string;
  brand: string;
  description: string;
  currentPrice: number;
  currency: string;
  searchQuery: string;
  confidence: number;
  rating?: number;
  reviewCount?: number;
  reasons: string[];
};

export async function discoverProducts(
  query: string,
  budget?: number,
  category?: string
): Promise<{ products: DiscoveredProduct[]; error?: string }> {
  if (!openai) {
    return {
      products: [],
      error: "AI service not configured. Please add OPENAI_API_KEY to environment variables."
    };
  }

  try {
    const systemPrompt = `You are a product discovery assistant for PriceDrop, a price tracking service. 
Your job is to find specific products that match the user's query and provide realistic pricing information.

For each product, provide:
- name: The exact product name/model
- brand: The manufacturer
- description: Brief product description
- currentPrice: Current market price in EUR (be realistic)
- currency: Always "EUR"
- searchQuery: A search query to find this product on retailers
- confidence: 0-100 score of how well it matches the request
- rating: Overall rating (0-5) if available
- reviewCount: Number of reviews if available
- reasons: List of 2-3 bullet points why this is a good match

Return 5-8 products. Focus on quality over quantity. Avoid scam/unreliable products.

Return ONLY valid JSON, no markdown formatting.`;

    const userPrompt = `Find the best products for: ${query}${budget ? ` under €${budget}` : ''}${category ? ` in the ${category} category` : ''}.

Return as JSON array with this structure:
{
  "products": [
    {
      "name": "string",
      "brand": "string",
      "description": "string",
      "currentPrice": number,
      "currency": "EUR",
      "searchQuery": "string",
      "confidence": number,
      "rating": number,
      "reviewCount": number,
      "reasons": ["string", "string"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { products: [], error: "No response from AI" };
    }

    const parsed = JSON.parse(content);
    return { products: parsed.products || [] };
  } catch (error) {
    console.error("AI discovery error:", error);
    return {
      products: [],
      error: error instanceof Error ? error.message : "Failed to discover products"
    };
  }
}
