import {
  RuleEvaluationRegularExpressionConfiguration,
  RuleEvaluationRegularExpressionSpecification,
} from '@latitude-data/constants'
import { IconName } from '@latitude-data/web-ui'

const specification = RuleEvaluationRegularExpressionSpecification
export default {
  ...specification,
  icon: 'regex' as IconName,
  configurationForm: ConfigurationForm,
}

function ConfigurationForm({
  configuration,
  onChange,
}: {
  configuration: RuleEvaluationRegularExpressionConfiguration
  onChange: (
    configuration: RuleEvaluationRegularExpressionConfiguration,
  ) => void
}) {
  return <div>ExactMatch</div>
}
