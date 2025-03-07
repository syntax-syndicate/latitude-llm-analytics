import { RuleEvaluationExactMatchSpecification } from '@latitude-data/constants'
import { IconName } from '@latitude-data/web-ui'

const specification = RuleEvaluationExactMatchSpecification
export default {
  ...specification,
  icon: 'equal' as IconName,
}
