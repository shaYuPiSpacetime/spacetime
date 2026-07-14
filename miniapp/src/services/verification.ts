import { prd01Api } from './prd01'
import type {
  EducationSubmitRequest,
  RealNameSubmitRequest,
  VerificationStatus,
} from '@/types/prd01'

export function getVerificationStatus(): Promise<VerificationStatus> {
  return prd01Api.getVerificationStatus()
}

export function submitRealName(data: RealNameSubmitRequest): Promise<VerificationStatus> {
  return prd01Api.submitRealName(data)
}

export function submitEducation(data: EducationSubmitRequest): Promise<VerificationStatus> {
  return prd01Api.submitEducation(data)
}
