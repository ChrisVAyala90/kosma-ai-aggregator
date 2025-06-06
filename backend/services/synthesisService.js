// backend/services/synthesisService.js

function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  // Convert to lowercase and split into words
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(word => word.length > 2));
  
  // Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function splitIntoSentences(text) {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 10);
}

function extractKeyPoints(text) {
  const sentences = splitIntoSentences(text);
  const keyPoints = [];
  
  sentences.forEach(sentence => {
    const indicators = ['recommend', 'suggest', 'important', 'key', 'should', 'best', 'main', 'first', 'consider'];
    const hasIndicator = indicators.some(indicator => 
      sentence.toLowerCase().includes(indicator)
    );
    
    if (hasIndicator && sentence.length > 30 && sentence.length < 200) {
      keyPoints.push(sentence.trim());
    }
  });
  
  return keyPoints.slice(0, 3);
}

function extractUniqueDetails(baseResponse, allResponses) {
  const baseSentences = splitIntoSentences(baseResponse.text);
  const uniqueDetails = [];
  
  allResponses.forEach(response => {
    if (response.source === baseResponse.source) return;
    
    const sentences = splitIntoSentences(response.text);
    sentences.forEach(sentence => {
      // Check if this sentence adds unique information
      const isUnique = !baseSentences.some(baseSentence => 
        calculateTextSimilarity(sentence, baseSentence) > 0.7
      );
      
      if (isUnique && sentence.length > 20 && sentence.length < 150) {
        uniqueDetails.push(`${response.source}: ${sentence.trim()}`);
      }
    });
  });
  
  return uniqueDetails.slice(0, 3);
}

function findCommonThemes(responses) {
  const themes = [];
  const allSentences = responses.flatMap(r => 
    splitIntoSentences(r.text).map(s => ({ text: s, source: r.source }))
  );
  
  // Find sentences that appear similar across responses
  const processedSentences = new Set();
  
  allSentences.forEach(sentence => {
    if (processedSentences.has(sentence.text)) return;
    
    const similar = allSentences.filter(other => 
      other.source !== sentence.source && 
      calculateTextSimilarity(sentence.text, other.text) > 0.6
    );
    
    if (similar.length > 0) {
      themes.push(sentence.text.trim());
      processedSentences.add(sentence.text);
      similar.forEach(s => processedSentences.add(s.text));
    }
  });
  
  return themes.slice(0, 4);
}

function findDisagreements(responses) {
  const disagreements = [];
  
  // Look for contrasting keywords
  const contrastPairs = [
    ['yes', 'no'], ['should', 'shouldn\'t'], ['good', 'bad'],
    ['recommend', 'avoid'], ['best', 'worst'], ['increase', 'decrease'],
    ['positive', 'negative'], ['agree', 'disagree'], ['support', 'oppose']
  ];
  
  contrastPairs.forEach(([word1, word2]) => {
    const hasWord1Sources = responses.filter(r => r.text.toLowerCase().includes(word1)).map(r => r.source);
    const hasWord2Sources = responses.filter(r => r.text.toLowerCase().includes(word2)).map(r => r.source);
    
    if (hasWord1Sources.length > 0 && hasWord2Sources.length > 0) {
      disagreements.push(`${hasWord1Sources.join(', ')} lean towards "${word1}" while ${hasWord2Sources.join(', ')} suggest "${word2}"`);
    }
  });
  
  return disagreements.slice(0, 2);
}

function synthesizeResponses(individualResponses) {
  // Filter out error responses and convert to consistent format
  const validResponses = [];
  
  Object.entries(individualResponses).forEach(([source, response]) => {
    if (!response.error && typeof response === 'string') {
      validResponses.push({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        text: response,
        length: response.length
      });
    }
  });
  
  if (validResponses.length === 0) {
    return {
      confidence: "No Valid Responses",
      confidenceScore: 0,
      synthesizedAnswer: "All AI services failed to provide valid responses.",
      approach: "error",
      sourcesUsed: [],
      reasoning: "No successful responses received"
    };
  }
  
  if (validResponses.length === 1) {
    return {
      confidence: "Single Source",
      confidenceScore: 50,
      synthesizedAnswer: validResponses[0].text,
      approach: "single",
      sourcesUsed: [validResponses[0].source],
      reasoning: "Only one AI service provided a valid response"
    };
  }
  
  // Calculate similarities between all response pairs
  const similarities = [];
  for (let i = 0; i < validResponses.length; i++) {
    for (let j = i + 1; j < validResponses.length; j++) {
      const similarity = calculateTextSimilarity(validResponses[i].text, validResponses[j].text);
      similarities.push(similarity);
    }
  }
  
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  
  // High overlap synthesis (70%+ similarity)
  if (avgSimilarity >= 0.7) {
    const baseResponse = validResponses.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    
    const uniqueDetails = extractUniqueDetails(baseResponse, validResponses);
    
    let synthesizedText = baseResponse.text;
    
    if (uniqueDetails.length > 0) {
      synthesizedText += "\n\n**Additional insights:**\n" + uniqueDetails.map(detail => `• ${detail}`).join("\n");
    }
    
    return {
      confidence: "High Confidence",
      confidenceScore: Math.round(avgSimilarity * 100),
      synthesizedAnswer: synthesizedText,
      approach: "consensus",
      sourcesUsed: validResponses.map(r => r.source),
      reasoning: `${validResponses.length} models provided similar answers (${Math.round(avgSimilarity * 100)}% agreement)`
    };
  }
  
  // Medium overlap synthesis (30-70% similarity)
  else if (avgSimilarity >= 0.3) {
    const commonThemes = findCommonThemes(validResponses);
    const disagreements = findDisagreements(validResponses);
    
    let synthesizedText = "**Based on multiple AI perspectives:**\n\n";
    
    if (commonThemes.length > 0) {
      synthesizedText += "**Common insights:**\n";
      commonThemes.forEach(theme => {
        synthesizedText += `• ${theme}\n`;
      });
    }
    
    if (disagreements.length > 0) {
      synthesizedText += "\n**Different perspectives:**\n";
      disagreements.forEach(disagreement => {
        synthesizedText += `• ${disagreement}\n`;
      });
    }
    
    return {
      confidence: "Multiple Perspectives",
      confidenceScore: Math.round(avgSimilarity * 100),
      synthesizedAnswer: synthesizedText,
      approach: "balanced",
      sourcesUsed: validResponses.map(r => r.source),
      reasoning: `Models showed ${Math.round(avgSimilarity * 100)}% agreement with notable differences`
    };
  }
  
  // Low overlap synthesis (<30% similarity)
  else {
    let synthesizedText = "**Different AI models suggest distinct approaches:**\n\n";
    
    validResponses.forEach((response) => {
      const keyPoints = extractKeyPoints(response.text);
      synthesizedText += `**${response.source} approach:**\n`;
      if (keyPoints.length > 0) {
        keyPoints.forEach(point => {
          synthesizedText += `• ${point}\n`;
        });
      } else {
        // Fallback to first sentence if no key points found
        const firstSentence = splitIntoSentences(response.text)[0];
        if (firstSentence) {
          synthesizedText += `• ${firstSentence}\n`;
        }
      }
      synthesizedText += "\n";
    });
    
    synthesizedText += "**Recommendation:** Consider combining elements from multiple approaches based on your specific context.";
    
    return {
      confidence: "Diverse Approaches",
      confidenceScore: Math.round(avgSimilarity * 100),
      synthesizedAnswer: synthesizedText,
      approach: "comparative",
      sourcesUsed: validResponses.map(r => r.source),
      reasoning: `Models provided significantly different approaches (${Math.round(avgSimilarity * 100)}% agreement)`
    };
  }
}

module.exports = { synthesizeResponses };