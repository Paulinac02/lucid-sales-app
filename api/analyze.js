export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  const prompt = `Eres un experto en e-commerce latinoamericano. Analiza el producto en esta URL usando web search y genera textos optimizados para cada campo de la plataforma de ventas Lucid Sales.

URL del producto: ${url}

Busca la información del producto en esa URL. Luego genera el contenido para cada campo CON EMOJIS relevantes en cada punto.

Responde ÚNICAMENTE con un JSON válido, sin markdown, sin explicaciones, con esta estructura exacta:
{
  "nombre": "Nombre del producto",
  "descripcion": "Descripción atractiva con emojis, máximo 300 palabras, orientada a ventas",
  "modo_uso": "Instrucciones numeradas con emojis de cómo usar el producto, máximo 200 palabras",
  "caracteristicas": "Lista de características técnicas con emojis: materiales, dimensiones, potencia, certificaciones, etc.",
  "contenido_paquete": "Lista con emojis ✅ de lo que incluye el paquete",
  "preguntas_frecuentes": "❓ Pregunta 1\\nRespuesta\\n\\n❓ Pregunta 2\\nRespuesta\\n\\n❓ Pregunta 3\\nRespuesta",
  "preguntas_postventa": "🔄 Pregunta 1\\nRespuesta\\n\\n🔄 Pregunta 2\\nRespuesta\\n\\n🔄 Pregunta 3\\nRespuesta"
}

Si no puedes acceder a la página, infiere los campos basándote en el nombre del producto en la URL. Responde SOLO con el JSON.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Error de API' });
    }

    const textBlocks = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No se pudo procesar la respuesta' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
