<script setup lang="ts">
import { savedAnswerDefinition, emptyAnswers, numberAnswer } from '../../../../app/domain/answer'
import { form, Q } from '../../f5/payloads'
defineOptions({ name: 'F6RendererHarness' })
const definition = savedAnswerDefinition(form())
const model = reactive(emptyAnswers(definition).model)
model.values[Q[0]!] = { type: 'text', raw: '完整\n合成文字' }
model.values[Q[1]!] = numberAnswer('9007199254740993.1234567890123456789')
model.values[Q[2]!] = { type: 'single_choice', optionKey: definition.questions[2]!.options[0]!.key }
model.values[Q[4]!] = { type: 'rating', value: 0 }
</script>
<template><section><h1>合成 readonly Renderer</h1><FormsFormRenderer :definition="definition" :model="model" readonly /></section></template>
