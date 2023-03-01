import { calculateScore } from "../src/tools/graph";
import {address} from './getJson'

calculateScore(address, Math.floor(new Date().getTime()/1000)).then(console.log);