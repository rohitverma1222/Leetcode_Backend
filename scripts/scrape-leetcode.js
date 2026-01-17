const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data.json');
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

const query = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      likes
      difficulty
    }
  }
`;

async function fetchProblemData(titleSlug) {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data?.question || null;
  } catch (error) {
    console.error(`Error fetching data for ${titleSlug}:`, error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const startArg = args.find(arg => arg.startsWith('--start='));
  const endArg = args.find(arg => arg.startsWith('--end='));
  const minRatingArg = args.find(arg => arg.startsWith('--minRating='));
  const maxRatingArg = args.find(arg => arg.startsWith('--maxRating='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;
  const start = startArg ? parseInt(startArg.split('=')[1]) : 0;
  const end = endArg ? parseInt(endArg.split('=')[1]) : Infinity;
  const minRating = minRatingArg ? parseFloat(minRatingArg.split('=')[1]) : -Infinity;
  const maxRating = maxRatingArg ? parseFloat(maxRatingArg.split('=')[1]) : Infinity;

  console.log('Reading data.json...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`Found ${data.length} problems.`);

  // Filter by rating range first if provided
  let filteredData = data;
  if (minRatingArg || maxRatingArg) {
    filteredData = data.filter(p => p.Rating >= minRating && p.Rating <= maxRating);
    console.log(`Filtered by rating [${minRating}, ${maxRating}]: ${filteredData.length} problems found.`);
  }

  // Then apply index-based range and limit
  const startIndex = start;
  const endIndex = Math.min(end, startIndex + limit, filteredData.length);
  const problemsToProcess = filteredData.slice(startIndex, endIndex);

  console.log(`Processing range: ${startIndex} to ${endIndex} (${problemsToProcess.length} problems)`);
  let count = 0;

  for (let i = 0; i < problemsToProcess.length; i++) {
    const problem = problemsToProcess[i];

    // Fetch data for every problem as requested
    console.log(`[${i + 1}/${problemsToProcess.length}] Fetching data for: ${problem.TitleSlug}...`);

    const leetCodeData = await fetchProblemData(problem.TitleSlug);

    if (leetCodeData) {
      problem.likes = leetCodeData.likes;
      problem.difficulty = leetCodeData.difficulty;
      count++;
    } else {
      console.warn(`Could not fetch data for ${problem.TitleSlug}`);
    }

    // Save progress every 20 problems
    if (count > 0 && count % 20 === 0) {
      console.log('Saving progress...');
      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    }

    // Rate limiting: 500ms delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('Final save...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  console.log(`Successfully updated ${count} problems.`);
}

main().catch(console.error);
