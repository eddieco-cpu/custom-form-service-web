<script setup lang="ts">
import { savedAnswerDefinition, emptyAnswers } from '../../../../app/domain/answer'
import { form, uuid } from '../../f5/payloads'
defineOptions({ name: 'F6RendererInstancesHarness' })
const rating = form().questions[4]!
const definition = ref(savedAnswerDefinition(form([0, 1].map(i => ({ ...rating, id: uuid(70 + i), sortOrder: i, title: 'Same rating title', type: 'rating', config: { variant: 'stars', min: 0, max: 5 } })))))
const models = { left: reactive(emptyAnswers(definition.value).model), right: reactive(emptyAnswers(definition.value).model) }
function rename() { definition.value = { ...definition.value, questions: definition.value.questions.map(q => ({ ...q, title: 'Renamed same title' })) } }
function reorder() { definition.value = { ...definition.value, questions: definition.value.questions.toReversed() } }
</script>
<template>
  <section>
    <h1>合成雙 Renderer</h1>
    <button type="button" @click="rename">改同名標題</button>
    <button type="button" @click="reorder">交換題目順序</button>
    <section v-for="(model, key) in models" :key="key" :data-renderer-instance="key">
      <FormsFormRenderer :definition="definition" :model="model" />
      <output data-answer-model>{{ JSON.stringify(model.values) }}</output>
    </section>
  </section>
</template>
