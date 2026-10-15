import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStatisticsNotes, formatStatisticsNumber, isValidStatisticsValues, matchingStatisticsSources, parseDataset, parseStatisticValue, statisticsExplanation, statisticsPracticeQuestions, statisticsSamples, statisticsSummary } from '../src/statistics.ts';
import { checkPracticeAnswer } from '../src/practice.ts';

test('dataset parsing retains order and duplicates with bounded decimal input', () => {
  assert.deepEqual(parseDataset(' 2, 4  4, -0.25, −1 '), { value: [2, 4, 4, -.25, -1] });
  for (const raw of ['', '1,2', Array(21).fill('1').join(','), '1,,2,3', '1,2,3,', '1,2,100.01', '1,2,-100.01', '1,2,.001', '1,2,NaN', '1,2,Infinity', '1,2,1e2', '1,2,1/2', '1,2,2+3', '1,2,0x2']) assert.ok(parseDataset(raw).error, raw);
  assert.equal(parseStatisticValue('-100').value, -100);
  assert.equal(parseStatisticValue('100.00').value, 100);
  assert.equal(parseStatisticValue('-0').value, 0);
  assert.equal(isValidStatisticsValues([1, 2, Infinity]), false);
  assert.equal(isValidStatisticsValues(['1', 2, 3]), false);
  assert.equal(isValidStatisticsValues([1, 2, 3.001]), false);
  assert.equal(isValidStatisticsValues(Array(3)), false);
});
test('summary uses numeric sorting, populations, decimals and duplicates without mutation', () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.deepEqual(statisticsSummary({ values }), { count: 8, mean: 5, median: 4.5, min: 2, max: 9, range: 7, populationStdDev: 2 });
  assert.deepEqual(values, [2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(statisticsSummary({ values: [10, 2, 3] }).median, 3);
  const even = statisticsSummary({ values: [-2, 5, 1, 2] });
  assert.equal(even.median, 1.5);
  assert.equal(even.mean, 1.5);
  assert.equal(even.range, 7);
  assert.equal(statisticsSummary({ values: [3, 3, 3] }).populationStdDev, 0);
  const decimals = statisticsSummary({ values: [.01, .02, .03] });
  assert.equal(decimals.mean, .02); assert.equal(decimals.median, .02); assert.equal(decimals.range, .02);
  assert.ok(Math.abs(decimals.populationStdDev - Math.sqrt(2 / 3) / 100) < 1e-12);
  assert.equal(statisticsSummary({ values: [-100, 0, 100] }).range, 200);
  assert.throws(() => statisticsSummary({ values: [] }));
});
test('notes recognition requires explicit labels and retains ordered provenance', () => {
  const notes = 'An example\rData: 3, 1, 1\rValues: 3 1 1';
  assert.deepEqual(analyzeStatisticsNotes(notes), { kind: 'recognized', parameters: { values: [3, 1, 1] }, lineNumbers: [2, 3] });
  assert.deepEqual(matchingStatisticsSources(notes, { values: [3, 1, 1] }), [2, 3]);
  assert.deepEqual(matchingStatisticsSources(notes, { values: [1, 1, 3] }), []);
  assert.equal(analyzeStatisticsNotes('Data: 1,2,3\nValues: 1,2,4').kind, 'ambiguous');
  assert.equal(analyzeStatisticsNotes('1,2,3').kind, 'manual');
  assert.equal(analyzeStatisticsNotes('Study the mean and median.').kind, 'manual');
  assert.equal(analyzeStatisticsNotes(' ').kind, 'empty');
  for (const notes of ['Data: 1,2,3,', 'Data: 1,2,101', 'Data: 1,2,3\ny=x^2', 'Study sample standard deviation', 'Data: [1,2,3]', 'x'.repeat(6001)]) assert.equal(analyzeStatisticsNotes(notes).kind, 'unsupported');
  statisticsSamples.forEach(sample => assert.equal(analyzeStatisticsNotes(sample.notes).kind, 'recognized'));
});
test('practice uses deterministic mean/median/population SD and existing tolerance', () => {
  const questions = statisticsPracticeQuestions({ values: [2, 4, 4, 4, 5, 5, 7, 9] });
  assert.deepEqual(questions.map(question => question.id), ['value', 'slope', 'intercept']);
  assert.deepEqual(questions.map(question => question.expected), [5, 4.5, 2]);
  assert.equal(checkPracticeAnswer(questions[2], '2').status, 'correct');
  assert.equal(checkPracticeAnswer(questions[2], String(Math.sqrt(32 / 7))).status, 'incorrect');
  assert.equal(checkPracticeAnswer(questions[0], '5.005').status, 'correct');
  assert.equal(checkPracticeAnswer(questions[0], '5.00501').status, 'incorrect');
  assert.equal(checkPracticeAnswer(questions[0], '40/8').status, 'invalid');
  assert.match(statisticsExplanation({ values: [1, 2, 3] }), /not n − 1/);
  assert.match(statisticsExplanation({ values: [1, 2, 3] }), /No automatic outlier/);
  assert.equal(formatStatisticsNumber(-.000001), '−0.000001');
});

test('supported summary formula prose stays local and never supplies extracted values', () => {
  const notes = 'Mean = sum / count\nData: 1, 2, 3\nRange = maximum - minimum\nPopulation standard deviation = sqrt(sum of squared deviations / n)';
  assert.deepEqual(analyzeStatisticsNotes(notes), { kind: 'recognized', parameters: { values: [1, 2, 3] }, lineNumbers: [2] });
  assert.equal(analyzeStatisticsNotes('Mean = 99\nMedian = 77').kind, 'manual');
  assert.deepEqual(matchingStatisticsSources(notes, { values: [1, 2, 3] }), [2]);
  for (const notes of ['Data: 1,2,3\ny=x^2', 'Data: 1,2,3\nSample standard deviation = 4', 'Data: 1,2,3\nMean = regression estimate', 'Data: 1,2,3\nConfidence interval = [1,3]']) assert.equal(analyzeStatisticsNotes(notes).kind, 'unsupported');
});
