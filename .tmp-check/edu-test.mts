import { parseEducation, degreeOptionPatterns, disciplineScore, schoolQueries } from "../src/lib/apply/education";
const cases = [
  { school: "Indian Institute of Technology Madras", place: "Chennai, India", degree: "Bachelor of Technology in Mechanical Engineering", dates: "July 2018 – May 2022", gpa: "8.31/10" },
  { school: "Stanford University", place: "", degree: "M.S., Computer Science", dates: "2020 - 2022", gpa: "" },
  { school: "IIT Bombay", place: "", degree: "B.Tech (Computer Science and Engineering)", dates: "Aug 2016 - Present", gpa: "9.1" },
  { school: "Harvard Business School", place: "", degree: "MBA", dates: "2019-2021", gpa: "" },
  { school: "MIT", place: "", degree: "PhD in Electrical Engineering", dates: "Sep 2015 - Jun 2020", gpa: "" },
  { school: "Delhi Public School", place: "", degree: "High School (CBSE)", dates: "2018", gpa: "95%" },
];
for (const c of cases) { const p = parseEducation(c); console.log(JSON.stringify({ level: p.level, discipline: p.discipline, sm: p.startMonth, sy: p.startYear, em: p.endMonth, ey: p.endYear, current: p.current })); }
const degrees = ["Associate's Degree","Bachelor's Degree","Doctor of Medicine (M.D.)","Doctor of Philosophy (Ph.D.)","Engineer's Degree","High School","Juris Doctor (J.D.)","Master of Business Administration (M.B.A.)","Master's Degree","Other"];
for (const lvl of ["bachelor","master","mba","phd","md","high_school","other"] as const) { const pats = degreeOptionPatterns(lvl); const hit = pats.map((re) => degrees.find((d) => re.test(d))).find(Boolean); console.log(lvl, "->", hit); }
const disciplines = ["Aerospace Engineering","Mechanical Engineering","Computer Science","Electrical Engineering","Business","Other","Engineering (Other)","Physics"];
for (const d of ["Mechanical Engineering","Computer Science and Engineering","Data Science","Electrical Engineering","Metallurgy"]) { const best = disciplines.map((o) => [o, disciplineScore(o, d)] as const).sort((a, b) => b[1] - a[1])[0]; console.log(d, "->", best); }
console.log(schoolQueries("Indian Institute of Technology Madras (IITM)"));
