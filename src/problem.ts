import { parseCoefficient, equationText } from './math.ts';
import { parseCalculusValue, quadraticText } from './calculus.ts';
import type { CalculusParameters } from './calculus.ts';
import { isValidStatisticsValues } from './statistics.ts';
import { isValidProbabilityParameters } from './probability.ts';
import {basicTaskIds,basicTaskLabels,validateBasicProblem,formatBasicProblem} from './basic-math.ts';
import type {BasicProblem,BasicTaskId} from './basic-math.ts';
export const taskIds = [...basicTaskIds,'linear.solve','linear.evaluate','calculus.derivative','calculus.evaluate','calculus.tangent','statistics.mean','statistics.median','statistics.range','statistics.population-sd','probability.exactly-k','probability.expected'] as const;
export type TaskId = typeof taskIds[number];
export type Problem =
  | BasicProblem
  | { task:'linear.solve'; parameters:{m:number;b:number;t:number} }
  | { task:'linear.evaluate'; parameters:{m:number;b:number;x:number} }
  | { task:'calculus.derivative'|'calculus.evaluate'|'calculus.tangent'; parameters:CalculusParameters }
  | { task:'statistics.mean'|'statistics.median'|'statistics.range'|'statistics.population-sd'; parameters:{values:number[]} }
  | { task:'probability.exactly-k'; parameters:{n:number;p:number;k:number} }
  | { task:'probability.expected'; parameters:{n:number;p:number;k?:number} };
export const taskLabels:Record<TaskId,string> = {...basicTaskLabels,'linear.solve':'Solve for x','linear.evaluate':'Evaluate the line','calculus.derivative':'Find the derivative','calculus.evaluate':'Evaluate the function','calculus.tangent':'Find the tangent','statistics.mean':'Find the mean','statistics.median':'Find the median','statistics.range':'Find the range','statistics.population-sd':'Find population standard deviation','probability.exactly-k':'Find exactly-k probability','probability.expected':'Find expected successes'};
export function isBasicProblem(problem:Problem):problem is BasicProblem {return basicTaskIds.includes(problem.task as BasicTaskId);}
export function validateProblem(value:unknown):string|null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Choose a supported task and its numeric values.';
  const data = value as Problem;
  if (!taskIds.includes(data.task)) return 'Choose a supported mathematics task.';
  const p = data.parameters;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'Enter the required parameters.';
  if(isBasicProblem(data))return validateBasicProblem(data);
  if (data.task === 'linear.solve' || data.task === 'linear.evaluate') {
    const keys = data.task === 'linear.solve' ? ['m','b','t'] : ['m','b','x'];
    if (keys.some(key => typeof (p as Record<string,unknown>)[key] !== 'number' || parseCoefficient(String((p as Record<string,unknown>)[key])).error)) return 'Use finite linear values from −10 to 10 with up to two decimals.';
  } else if (data.task === 'calculus.derivative' || data.task === 'calculus.evaluate' || data.task === 'calculus.tangent') {
    if ((['a','b','c','x0'] as const).some(key => typeof data.parameters[key] !== 'number' || parseCalculusValue(String(data.parameters[key]),key).error)) return 'Use coefficients from −5 to 5 and x₀ from −3 to 3, up to two decimals.';
  } else if (data.task === 'statistics.mean' || data.task === 'statistics.median' || data.task === 'statistics.range' || data.task === 'statistics.population-sd') {
    if (!isValidStatisticsValues(data.parameters.values)) return 'Use 3–20 values from −100 to 100, up to two decimals.';
  } else if (!isValidProbabilityParameters(data.task === 'probability.expected' ? {...data.parameters,k:data.parameters.k === undefined ? 0 : data.parameters.k} : data.parameters)) return 'Use integer n from 1 to 30, p from 0 to 1 with up to two decimals, and integer k from 0 to n when required.';
  return null;
}
export function formatProblem(problem:Problem):string {
  const error = validateProblem(problem); if (error) throw new Error(error);
  if(isBasicProblem(problem))return formatBasicProblem(problem);
  if (problem.task === 'linear.solve') return `${equationText(problem.parameters.m,problem.parameters.b).replace(/^y = /,'')} = ${problem.parameters.t}`;
  if (problem.task === 'linear.evaluate') return `${equationText(problem.parameters.m,problem.parameters.b)} at x = ${problem.parameters.x}`;
  if ('a' in problem.parameters) return `${quadraticText(problem.parameters)} at x₀ = ${problem.parameters.x0}`;
  if ('values' in problem.parameters) return `Data: ${problem.parameters.values.join(', ')}`;
  return `Binomial: n=${problem.parameters.n}, p=${problem.parameters.p}${problem.parameters.k === undefined ? '' : `, k=${problem.parameters.k}`}`;
}
