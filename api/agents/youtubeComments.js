/**
 * YouTube Comments Agent
 * Extracts pinned comments from YouTube videos
 */

/**
 * Extracts the pinned comment from a YouTube video
 * @param {string} videoId - YouTube video ID
 * @param {string} youtubeApiKey - YouTube Data API key
 * @returns {Promise<string|null>} - Pinned comment text or null if not found
 */
async function extractPinnedComment(videoId, youtubeApiKey) {
  try {
    // Fetch top-level comments for the video
    // We'll get the first few and check if any are pinned
    const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=10&key=${youtubeApiKey}`;

    console.log('Fetching comments for video:', videoId);

    const response = await fetch(commentsUrl);

    if (!response.ok) {
      if (response.status === 403) {
        console.warn('Comments are disabled for this video or API quota exceeded');
      } else {
        console.error('YouTube Comments API error:', response.status);
      }
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No comments found on this video');
      return null;
    }

    // Look for pinned comment
    // Note: YouTube API doesn't have a direct "pinned" flag in commentThreads
    // The pinned comment is usually the first comment when sorted by relevance
    // and often has high engagement or is from the channel owner

    for (const item of data.items) {
      const snippet = item.snippet?.topLevelComment?.snippet;
      if (!snippet) continue;

      // Check if comment is from the channel owner (likely pinned)
      const isChannelOwner = snippet.authorChannelId?.value === item.snippet.channelId;

      // The first comment from channel owner with substantial text is likely pinned
      if (isChannelOwner && snippet.textDisplay && snippet.textDisplay.length > 50) {
        console.log('Found potential pinned comment from channel owner');
        // Remove HTML tags and decode entities
        const commentText = snippet.textDisplay
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/<br\s*\/?>/gi, '\n');

        return commentText;
      }
    }

    // If no comment from channel owner, check the top comment
    const topComment = data.items[0]?.snippet?.topLevelComment?.snippet;
    if (topComment && topComment.textDisplay && topComment.textDisplay.length > 50) {
      console.log('Using top comment as potential pinned comment');
      const commentText = topComment.textDisplay
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<br\s*\/?>/gi, '\n');

      return commentText;
    }

    console.log('No suitable pinned comment found');
    return null;

  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return null;
  }
}

/**
 * Checks if a comment contains recipe information
 * @param {string} commentText - Comment text to analyze
 * @param {string} geminiApiKey - Gemini API key
 * @returns {Promise<boolean>} - True if comment contains recipe
 */
async function commentContainsRecipe(commentText, geminiApiKey) {
  try {
    const prompt = `Does this comment contain a recipe (ingredients and instructions)?

COMMENT:
${commentText}

Answer with ONLY one word: "YES" if it contains a recipe, "NO" if it doesn't.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';

    return answer.includes('YES');

  } catch (error) {
    console.error('Error checking comment for recipe:', error);
    return false;
  }
}

export { extractPinnedComment, commentContainsRecipe };
