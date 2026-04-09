// Parses Google Sheets exported CSV into structured ideation rows
// Column order from Google Forms: Timestamp, Emp ID, Problem, Solution, Benefits, Department
export const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    return {
      timestamp:  cols[0] || '',
      empId:      cols[1] || '',
      problem:    cols[2] || '',
      solution:   cols[3] || '',
      benefits:   cols[4] || '',
      department: cols[5] || '',
    };
  }).filter(r => r.empId);
};

const splitCSVLine = (line) => {
  const result = [];
  let current  = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
};
