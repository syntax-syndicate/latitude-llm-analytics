import { RuleEvaluationRegularExpressionSpecification } from '@latitude-data/constants'
import { IconName } from '@latitude-data/web-ui'

const specification = RuleEvaluationRegularExpressionSpecification
export default {
  ...specification,
  icon: 'regex' as IconName,
}
