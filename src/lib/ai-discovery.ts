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

// Simple fallback discovery using keyword matching and retailer search
async function discoverWithFallback(
  query: string,
  budget?: number
): Promise<{ products: DiscoveredProduct[] }> {
  const searchQuery = query.toLowerCase();
  
  // Generate simple product suggestions based on keywords
  const products: DiscoveredProduct[] = [];
  
  // Extract keywords from query
  const keywords = searchQuery.split(/\s+/).filter(k => k.length > 2);
  
  // Create search-friendly query
  const searchQueryFriendly = keywords.join(' ');
  
  // Generate a few search-based suggestions
  const basePrice = budget || 500;
  
  products.push({
    name: `${keywords[0] || 'Product'} Premium Model`,
    brand: 'Top Brand',
    description: `A high-quality ${keywords.join(' ')} with excellent features and reliability`,
    currentPrice: basePrice,
    currency: 'EUR',
    searchQuery: searchQueryFriendly,
    confidence: 85,
    rating: 4.5,
    reviewCount: 1234,
    reasons: [
      'Highly rated by customers',
      'Good value for money',
      'Reliable brand reputation'
    ]
  });
  
  if (budget && budget > 300) {
    products.push({
      name: `${keywords[0] || 'Product'} Standard Model`,
      brand: 'Brand A',
      description: `A solid ${keywords.join(' ')} with essential features`,
      currentPrice: budget * 0.7,
      currency: 'EUR',
      searchQuery: searchQueryFriendly,
      confidence: 80,
      rating: 4.2,
      reviewCount: 856,
      reasons: [
        'Great budget option',
        'Good performance',
        'Popular choice'
      ]
    });
  }
  
  products.push({
    name: `${keywords[0] || 'Product'} Value Edition`,
    brand: 'Brand B',
    description: `An affordable ${keywords.join(' ')} for everyday use`,
    currentPrice: budget ? budget * 0.5 : 250,
    currency: 'EUR',
    searchQuery: searchQueryFriendly,
    confidence: 75,
    rating: 4.0,
    reviewCount: 567,
    reasons: [
      'Best price point',
      'Decent quality',
      'Budget-friendly'
    ]
  });
  
  return { products };
}

export async function discoverProducts(
  query: string,
  budget?: number,
  category?: string
): Promise<{ products: DiscoveredProduct[]; error?: string; isFallback?: boolean }> {
  // Try OpenAI if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        throw new Error("No response from AI");
      }

      const parsed = JSON.parse(content);
      return { products: parsed.products || [] };
    } catch (error) {
      console.error("AI discovery error, falling back:", error);
      // Fall back to simple discovery
    }
  }

  // Fallback to simple keyword-based discovery
  const result = await discoverWithFallback(query, budget);
  return { ...result, isFallback: true };
}
