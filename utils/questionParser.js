export async function parseQuestionFile(fileData) {
  const buffer = await fileData.toBuffer();
  const content = buffer.toString('utf8');
  
  const questions = [];
  const blocks = content.split('\n\n').filter(block => block.trim());
  
  for (const block of blocks) {
    const lines = block.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length < 6) {
      throw new Error(`Invalid question format. Each question must have 6 lines. Found: ${lines.length}`);
    }
    
    const question = {
      text: lines[0],
      options: lines.slice(1, 5),
      correctIndex: parseInt(lines[5]) - 1 // Convert to 0-based index
    };
    
    if (isNaN(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      throw new Error(`Invalid correct index: ${lines[5]}. Must be between 1 and 4.`);
    }
    
    questions.push(question);
  }
  
  if (questions.length === 0) {
    throw new Error('No valid questions found in the file.');
  }
  
  return questions;
}