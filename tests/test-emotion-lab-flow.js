const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const mockPath = path.join(root, 'mock/emotionLab.uts')
const questionBankPath = path.join(root, 'mock/mbtiQuestionBank.uts')
const apiPath = path.join(root, 'api/emotionLab.uts')
const apiIndexPath = path.join(root, 'api/index.uts')
const pagePath = path.join(root, 'pages/emotion-lab/emotion-lab.uvue')
const userEditPath = path.join(root, 'pages/user/edit.uvue')
const userMockPath = path.join(root, 'mock/user.uts')
const authApiPath = path.join(root, 'api/auth.uts')
const configApiPath = path.join(root, 'api/config.uts')

let moduleSequence = 0

function expectThrows(action, code) {
  assert.throws(action, error => {
    return error instanceof Error && error.message.includes(code)
  }, `expected ${code}`)
}

function fixtureDefinition() {
  return {
    id: 'mbti-contract-fixture',
    version: 'mbti-contract-fixture@1',
    kind: 'mbti',
    title: 'MBTI contract fixture',
    authorization: { status: 'verified' },
    canStart: true,
    questionCount: 8,
    scale: { min: 1, max: 5 },
    dimensions: ['EI', 'SN', 'TF', 'JP'],
    resultCopyVersion: 'mbti-result-copy@2'
  }
}

function fixtureQuestions() {
  const questions = []
  for (const dimension of ['EI', 'SN', 'TF', 'JP']) {
    questions.push({
      id: `fixture-${dimension.toLowerCase()}-positive`,
      text: `${dimension} positive scoring fixture`,
      dimension,
      direction: 1,
      scaleMin: 1,
      scaleMax: 5,
      options: [1, 2, 3, 4, 5]
    })
    questions.push({
      id: `fixture-${dimension.toLowerCase()}-reverse`,
      text: `${dimension} reverse scoring fixture`,
      dimension,
      direction: -1,
      scaleMin: 1,
      scaleMax: 5,
      options: [1, 2, 3, 4, 5]
    })
  }
  return questions
}

function answersFavoringFirstPole(questions) {
  return questions.map(question => ({
    questionId: question.id,
    value: question.direction === 1 ? 5 : 1
  }))
}

function answersFavoringSecondPole(questions) {
  return questions.map(question => ({
    questionId: question.id,
    value: question.direction === 1 ? 1 : 5
  }))
}

function stripUtsAnnotations(source) {
  return source
    .replace(/\s+as\s+any(?:\[\])?/g, '')
    .replace(/\b(let|const|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;\n]+=/g, '$1 $2 =')
    .replace(
      /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*[^\{]+)?\{/g,
      (_match, name, rawArgs) => {
        const args = rawArgs.replace(/([A-Za-z_$][\w$]*)\s*:\s*[^,=]+/g, '$1')
        return `function ${name}(${args}) {`
      }
    )
    .replace(/\(([^)]*)\)\s*=>/g, (_match, rawArgs) => {
      const args = rawArgs.replace(/([A-Za-z_$][\w$]*)\s*:\s*[^,]+/g, '$1')
      return `(${args}) =>`
    })
}

async function loadUtsSource(source) {
  moduleSequence += 1
  const transformed = stripUtsAnnotations(source) +
    `\n// isolated test module ${moduleSequence}\n`
  const encoded = Buffer.from(transformed).toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

async function loadUtsModule(filePath) {
  return loadUtsSource(fs.readFileSync(filePath, 'utf8'))
}

async function loadMockModule() {
  const questionBank = fs.readFileSync(questionBankPath, 'utf8')
  const emotionLab = fs.readFileSync(mockPath, 'utf8').replace(
    /import\s+\{[\s\S]*?\}\s+from\s+'\.\/mbtiQuestionBank\.uts'\s*/,
    ''
  )
  return loadUtsSource(questionBank + '\n' + emotionLab)
}

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.has(key) ? JSON.parse(JSON.stringify(values.get(key))) : null
    },
    setItem(key, value) {
      values.set(key, JSON.parse(JSON.stringify(value)))
    },
    removeItem(key) {
      values.delete(key)
    }
  }
}

function openFixtureAssessment(lab, questions) {
  lab.mockMbtiAssessmentDefinition.authorization.status = 'verified'
  lab.mockMbtiAssessmentDefinition.authorization.label = '内容已审核'
  lab.mockMbtiAssessmentDefinition.canStart = true
  lab.mockMbtiAssessmentDefinition.questionCount = questions.length
  lab.mockMbtiAssessmentDefinition.scale = { min: 1, max: 5 }
  lab.mockMbtiQuestionBank.splice(0, lab.mockMbtiQuestionBank.length, ...questions)
}

async function run() {
  const unconfiguredLab = await loadMockModule()
  expectThrows(() => unconfiguredLab.getEmotionLabSummaryData(), 'EMOTION_LAB_SUBJECT_REQUIRED')
  const lab = await loadMockModule()
  const user = await loadUtsModule(userMockPath)
  const storage = createMemoryStorage()
	globalThis.uni = {
		getStorageSync: key => storage.getItem(key),
		setStorageSync: (key, value) => storage.setItem(key, value),
		removeStorageSync: key => storage.removeItem(key),
	}
  let currentSubject = 'mock-user:9001'
  let profileWriteCount = 0
  lab.configureEmotionLabMockRuntime(
    storage,
    () => currentSubject,
    (profileSource, subjectId) => {
      profileWriteCount += 1
		assert.strictEqual(subjectId, currentSubject, 'profile writer must receive the authenticated subject')
		return user.syncMockMeMbtiProfileData(profileSource, subjectId)
    }
  )
  const mock = fs.readFileSync(mockPath, 'utf8')

  const storageFailureSubject = 'user:storage-failure'
  user.syncMockMeMbtiProfileData({
    mbtiType: 'INFP', source: 'self_reported', confirmed: true
  }, storageFailureSubject)
  const workingGetStorageSync = globalThis.uni.getStorageSync
  const workingSetStorageSync = globalThis.uni.setStorageSync
  globalThis.uni.getStorageSync = () => {
    throw new Error('storage unavailable')
  }
  globalThis.uni.setStorageSync = () => {
    throw new Error('storage unavailable')
  }
  expectThrows(() => user.syncMockMeMbtiProfileData({
    mbtiType: 'ENFP', source: 'self_reported', confirmed: true
  }, storageFailureSubject), 'storage unavailable')
  assert.strictEqual(
    user.getMockMeMbtiProfileData(storageFailureSubject).mbti,
    'INFP',
    'failed persistence must restore the previous in-memory profile snapshot'
  )
  globalThis.uni.getStorageSync = workingGetStorageSync
  globalThis.uni.setStorageSync = workingSetStorageSync

  for (const declaration of [
    'export const mockMbtiQuestionBank: any[] = createMockMbtiQuestionBank()',
    'let storageAdapter: any = null',
    'let subjectResolver: any = null',
    'let profileWriter: any = null',
    'const memoryStorage: any = {}',
    'const map: any = {}',
    'const seen: any = {}',
    'const dimensions: any =',
    'const values: any = {}',
    'const ordered: any[] = []',
    'const poles: any =',
    'const answerMap: any = {}',
    'const dimensionScore: any = {}',
    'const publicQuestions: any[] = []',
    'const scoringKeys: any[] = []',
    'const questionIds: any[] = []',
    'const merged: any = {}'
  ]) {
    assert.ok(mock.includes(declaration), `mock should use the UTS-safe declaration ${declaration}`)
  }
  const questionBank = fs.readFileSync(questionBankPath, 'utf8')
  assert.ok(questionBank.includes("'mbti-16p-001'"), 'approved bank should retain stable string IDs')
  assert.ok(questionBank.includes("'mbti-16p-060'"), 'approved bank should contain all 60 questions')
  assert.ok(questionBank.includes('direction: row[3]'), 'approved bank should preserve scoring direction')
  assert.doesNotMatch(
    mock,
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:\{\}|\[\]|null)(?:\s|$)/,
    'mock should not rely on implicit types for mutable maps, arrays, or null state'
  )
  for (const signature of [
    'function clone(value: any): any {',
    'function fail(code: string, message: string): void {',
    'function validateQuestionBank(definition: any, questions: any[]): void {',
    'function canonicalAnswers(snapshot: any, answers: any): any[] {',
    'function readSubjectState(): any {',
    'function writeSubjectState(state: any): void {',
    'export function configureEmotionLabMockRuntime(adapter: any, resolver: any, writer: any): void {',
    "export function createMbtiSessionSnapshot(definition: any, questions: any[], suppliedSessionId: string = ''): any {",
    'export function saveEmotionLabAnswersData(sessionId: string, answers: any[]): any {',
    'export function setEmotionLabProfileSourceData(payload: any): any {'
  ]) {
    assert.ok(mock.includes(signature), `mock should expose the UTS-safe signature ${signature}`)
  }
  assert.ok(
    mock.includes('disclaimer: copy.disclaimer'),
    'result copy should resolve its disclaimer from the requested copy version'
  )
  assert.ok(
    mock.includes('disclaimer: RESULT_COPY_BY_VERSION[CURRENT_RESULT_COPY_VERSION].disclaimer'),
    'summary fallback should derive from the current version registry entry'
  )
  assert.ok(!mock.includes('DEFAULT_SUBJECT_ID'), 'Mock data must not retain an unscoped fallback subject')

  const summary = lab.getEmotionLabSummaryData()
  assert.strictEqual(summary.assessments.length, 1)
  assert.strictEqual(summary.assessments[0].kind, 'mbti')
  assert.strictEqual(summary.assessments[0].authorization.status, 'approved')
  assert.strictEqual(summary.assessments[0].canStart, true)
  assert.strictEqual(summary.assessments[0].version, 'mbti-core@2')
  assert.strictEqual(summary.assessments[0].questionCount, 60)
  assert.deepStrictEqual(summary.assessments[0].scale, { min: 1, max: 7 })
  assert.strictEqual(summary.manualTypes.length, 16)
  assert.ok(summary.disclaimer.includes('不构成心理诊断'))
  assert.strictEqual(summary.disclaimerVersion, 'mbti-result-copy@2')
  assert.strictEqual(profileWriteCount, 0, 'reading the summary must not write profile data')
  const approvedCoreSession = lab.startEmotionLabSessionData(summary.assessments[0].id)
  assert.strictEqual(approvedCoreSession.questions.length, 60)
  assert.ok(approvedCoreSession.questionIds.every(id => id.startsWith('mbti-16p-')))
  lab.discardEmotionLabSessionData(approvedCoreSession.id)

  currentSubject = ''
  expectThrows(() => lab.getEmotionLabSummaryData(), 'EMOTION_LAB_SUBJECT_REQUIRED')
  currentSubject = 'mock-user:9001'

  const definition = fixtureDefinition()
  const questions = fixtureQuestions()

  const closedDefinition = fixtureDefinition()
  closedDefinition.canStart = false
  expectThrows(
    () => lab.createMbtiSessionSnapshot(closedDefinition, fixtureQuestions(), 'mbti-session-closed'),
    'ASSESSMENT_NOT_OPEN'
  )

  const approvedDefinition = fixtureDefinition()
  approvedDefinition.authorization.status = 'approved'
  const approvedSnapshot = lab.createMbtiSessionSnapshot(
    approvedDefinition,
    fixtureQuestions(),
    'mbti-session-approved'
  )
  assert.strictEqual(approvedSnapshot.status, 'in_progress')

  const unknownCopyDefinition = fixtureDefinition()
  unknownCopyDefinition.resultCopyVersion = 'mbti-result-copy@unknown'
  expectThrows(
    () => lab.createMbtiSessionSnapshot(unknownCopyDefinition, fixtureQuestions(), 'mbti-session-copy'),
    'RESULT_COPY_VERSION_UNSUPPORTED'
  )

  const numericIdQuestions = fixtureQuestions()
  numericIdQuestions[0].id = 101
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, numericIdQuestions, 'mbti-session-numeric-id'),
    'QUESTION_ID_REQUIRED'
  )

  const whitespaceIdQuestions = fixtureQuestions()
  whitespaceIdQuestions[0].id = ' fixture-ei-positive '
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, whitespaceIdQuestions, 'mbti-session-whitespace-id'),
    'QUESTION_ID_WHITESPACE'
  )

  const emptyTextQuestions = fixtureQuestions()
  emptyTextQuestions[0].text = '   '
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, emptyTextQuestions, 'mbti-session-empty-text'),
    'QUESTION_TEXT_REQUIRED'
  )

  const emptyOptionsQuestions = fixtureQuestions()
  emptyOptionsQuestions[0].options = []
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, emptyOptionsQuestions, 'mbti-session-empty-options'),
    'QUESTION_OPTIONS_REQUIRED'
  )

  const duplicateOptionsQuestions = fixtureQuestions()
  duplicateOptionsQuestions[0].options = [1, 2, 2, 4, 5]
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, duplicateOptionsQuestions, 'mbti-session-duplicate-options'),
    'QUESTION_OPTION_DUPLICATE'
  )

  const nonNumericOptionsQuestions = fixtureQuestions()
  nonNumericOptionsQuestions[0].options = [1, 2, '3', 4, 5]
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, nonNumericOptionsQuestions, 'mbti-session-string-option'),
    'QUESTION_OPTION_INVALID'
  )

  const outOfRangeOptionsQuestions = fixtureQuestions()
  outOfRangeOptionsQuestions[0].options = [0, 1, 2, 3, 4]
  expectThrows(
    () => lab.createMbtiSessionSnapshot(definition, outOfRangeOptionsQuestions, 'mbti-session-option-range'),
    'QUESTION_OPTION_OUT_OF_RANGE'
  )

  const wrongCountDefinition = fixtureDefinition()
  wrongCountDefinition.questionCount = fixtureQuestions().length + 1
  expectThrows(
    () => lab.createMbtiSessionSnapshot(wrongCountDefinition, fixtureQuestions(), 'mbti-session-question-count'),
    'QUESTION_COUNT_MISMATCH'
  )

  const snapshot = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-fixed')
  assert.strictEqual(snapshot.schemaVersion, 2)
  assert.strictEqual(snapshot.id, 'mbti-session-fixed')
  assert.strictEqual(snapshot.definitionVersion, definition.version)
  assert.deepStrictEqual(snapshot.questionIds, questions.map(question => question.id))
  assert.ok(snapshot.questionIds.every(id => typeof id === 'string' && id.length > 0))
  assert.ok(
    snapshot.scoringKeys.every(key => JSON.stringify(key.optionValues) === JSON.stringify([1, 2, 3, 4, 5])),
    'each scoring key must freeze the allowed option values'
  )
  const publicSnapshot = lab.toPublicSessionSnapshot(snapshot)
  assert.ok(!Object.prototype.hasOwnProperty.call(publicSnapshot, 'scoringKeys'))
  assert.ok(publicSnapshot.questions.every(question => question.dimension == null && question.direction == null))

  const sparseOptionQuestions = fixtureQuestions()
  for (const question of sparseOptionQuestions) question.options = [1, 3, 5]
  const sparseOptionSnapshot = lab.createMbtiSessionSnapshot(
    definition,
    sparseOptionQuestions,
    'mbti-session-sparse-options'
  )
  expectThrows(() => lab.saveMbtiSnapshotAnswers(sparseOptionSnapshot, [
    { questionId: sparseOptionQuestions[0].id, value: 2 }
  ]), 'ANSWER_OPTION_NOT_ALLOWED')

  const partial = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-partial')
  const partialSaved = lab.saveMbtiSnapshotAnswers(partial, [
    { questionId: questions[0].id, value: 5 }
  ])
  assert.strictEqual(partialSaved.status, 'in_progress')
  assert.strictEqual(partialSaved.answers.length, 1)
  expectThrows(() => lab.submitMbtiSessionSnapshot(partialSaved, partialSaved.answers), 'ANSWERS_INCOMPLETE')
  expectThrows(
    () => lab.submitMbtiSessionSnapshot(
      partialSaved,
      answersFavoringFirstPole(questions).filter(answer => answer.questionId != questions[0].id)
    ),
    'ANSWERS_INCOMPLETE'
  )

  const duplicate = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-duplicate')
  expectThrows(() => lab.saveMbtiSnapshotAnswers(duplicate, [
    { questionId: questions[0].id, value: 5 },
    { questionId: questions[0].id, value: 4 }
  ]), 'ANSWER_DUPLICATE')
  expectThrows(() => lab.saveMbtiSnapshotAnswers(duplicate, [
    { questionId: questions[0].id, value: 6 }
  ]), 'ANSWER_OUT_OF_RANGE')
  expectThrows(() => lab.saveMbtiSnapshotAnswers(duplicate, [
    { questionId: questions[0].id, value: '5' }
  ]), 'ANSWER_OUT_OF_RANGE')
  expectThrows(() => lab.saveMbtiSnapshotAnswers(duplicate, [
    { questionId: 'fixture-unknown', value: 3 }
  ]), 'ANSWER_NOT_IN_SNAPSHOT')
  expectThrows(() => lab.saveMbtiSnapshotAnswers(duplicate, [
    { questionId: ` ${questions[0].id}`, value: 3 }
  ]), 'ANSWER_QUESTION_ID_WHITESPACE')

  const firstPole = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-first')
  const firstResult = lab.submitMbtiSessionSnapshot(firstPole, answersFavoringFirstPole(questions))
  assert.strictEqual(firstResult.result.mbtiType, 'ESTJ')
  assert.deepStrictEqual(firstResult.result.dimensions.EI, { E: 100, I: 0 })
  assert.deepStrictEqual(firstResult.result.dimensions.SN, { S: 100, N: 0 })
  assert.deepStrictEqual(firstResult.result.dimensions.TF, { T: 100, F: 0 })
  assert.deepStrictEqual(firstResult.result.dimensions.JP, { J: 100, P: 0 })
  assert.strictEqual(firstResult.result.assessmentVersion, definition.version)
  assert.strictEqual(firstResult.result.resultCopy.version, definition.resultCopyVersion)
  assert.ok(firstResult.result.resultCopy.disclaimer.includes('不构成心理诊断'))
  assert.strictEqual(firstResult.result.resultCopy.disclaimer, summary.disclaimer)

  const idempotent = lab.submitMbtiSessionSnapshot(firstResult, answersFavoringFirstPole(questions))
  assert.deepStrictEqual(idempotent.result, firstResult.result)
  expectThrows(
    () => lab.submitMbtiSessionSnapshot(firstResult, answersFavoringSecondPole(questions)),
    'SESSION_ALREADY_COMPLETED'
  )

  const secondPole = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-second')
  const secondResult = lab.submitMbtiSessionSnapshot(secondPole, answersFavoringSecondPole(questions))
  assert.strictEqual(secondResult.result.mbtiType, 'INFP')
  assert.deepStrictEqual(secondResult.result.dimensions.EI, { E: 0, I: 100 })

  const neutral = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-neutral')
  const neutralAnswers = questions.map(question => ({ questionId: question.id, value: 3 }))
  const neutralResult = lab.submitMbtiSessionSnapshot(neutral, neutralAnswers)
  assert.strictEqual(neutralResult.result.mbtiType, 'ESTJ')
  assert.deepStrictEqual(neutralResult.result.dimensions.EI, { E: 50, I: 50 })

  const allHigh = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-all-high')
  const allHighResult = lab.submitMbtiSessionSnapshot(
    allHigh,
    questions.map(question => ({ questionId: question.id, value: 5 }))
  )
  assert.strictEqual(allHighResult.result.mbtiType, 'ESTJ')
  assert.deepStrictEqual(allHighResult.result.dimensions.EI, { E: 50, I: 50 })

  const allLow = lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-all-low')
  const allLowResult = lab.submitMbtiSessionSnapshot(
    allLow,
    questions.map(question => ({ questionId: question.id, value: 1 }))
  )
  assert.strictEqual(allLowResult.result.mbtiType, 'ESTJ')
  assert.deepStrictEqual(allLowResult.result.dimensions.EI, { E: 50, I: 50 })

  expectThrows(() => lab.setEmotionLabProfileSourceData({
    mbtiType: 'INFP', source: 'self_reported', confirmed: false
  }), 'PROFILE_SYNC_CONFIRMATION_REQUIRED')

  openFixtureAssessment(lab, questions)
  currentSubject = 'user:account-a'
  const accountASession = lab.startEmotionLabSessionData('mbti-core')
  const accountADraft = lab.saveEmotionLabAnswersData(accountASession.id, [
    { questionId: questions[0].id, value: 5 }
  ])
  assert.strictEqual(accountADraft.answers.length, 1)

  const selfReported = lab.setEmotionLabProfileSourceData({
    mbtiType: 'INFP', source: 'self_reported', confirmed: true
  })
  assert.strictEqual(selfReported.mbtiType, 'INFP')
  assert.strictEqual(selfReported.source, 'self_reported')
  assert.strictEqual(selfReported.assessmentVersion, null)
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-a').mbti, 'INFP', 'profile boundary should update only account A')
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-a').mbtiSource, 'self_reported')
  assert.strictEqual(profileWriteCount, 1, 'explicit confirmation should perform exactly one profile write')

  currentSubject = 'user:account-b'
  const accountBEmptySummary = lab.getEmotionLabSummaryData()
  assert.strictEqual(accountBEmptySummary.activeSession, null, 'account B must not see account A draft')
  assert.strictEqual(accountBEmptySummary.profileSource, null, 'account B must not see account A profile source')
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-a').mbti, 'INFP', 'summary reads must not overwrite account A')
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-b').mbti, '', 'account B must not inherit account A MBTI')
  assert.strictEqual(profileWriteCount, 1, 'switching subjects through a summary read must remain side-effect free')

  currentSubject = 'user:account-a'
  const accountACompleted = lab.submitEmotionLabSessionData(
    accountASession.id,
    answersFavoringFirstPole(questions)
  )
  assert.strictEqual(accountACompleted.status, 'completed')
  const assessed = lab.setEmotionLabProfileSourceData({
    mbtiType: accountACompleted.result.mbtiType,
    source: 'assessment',
    confirmed: true,
    resultId: accountACompleted.result.id
  })
  assert.strictEqual(assessed.source, 'assessment')
  assert.strictEqual(assessed.assessmentVersion, lab.mockMbtiAssessmentDefinition.version)
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-a').mbti, accountACompleted.result.mbtiType)
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-a').mbtiSource, 'assessment')

  currentSubject = 'user:account-b'
  expectThrows(() => lab.setEmotionLabProfileSourceData({
    mbtiType: accountACompleted.result.mbtiType,
    source: 'assessment',
    confirmed: true,
    resultId: accountACompleted.result.id
  }), 'ASSESSMENT_RESULT_REQUIRED')
  const accountBSelfReported = lab.setEmotionLabProfileSourceData({
    mbtiType: 'ENFP', source: 'self_reported', confirmed: true
  })
  assert.strictEqual(accountBSelfReported.mbtiType, 'ENFP')
	assert.strictEqual(user.getMockMeMbtiProfileData('user:account-b').mbti, 'ENFP')
	assert.notStrictEqual(
		user.getMockMeMbtiProfileData('user:account-a').mbti,
		user.getMockMeMbtiProfileData('user:account-b').mbti,
		'separate accounts must keep separate profile values',
	)

  currentSubject = 'user:account-c'
  const accountCSession = lab.startEmotionLabSessionData('mbti-core')
  const accountCDraft = lab.saveEmotionLabAnswersData(accountCSession.id, [
    { questionId: questions[0].id, value: 4 }
  ])
  assert.strictEqual(accountCDraft.status, 'in_progress')
  assert.strictEqual(accountCDraft.answers.length, 1)

  const reloadedLab = await loadMockModule()
  const reloadedUser = await loadUtsModule(userMockPath)
  let reloadedProfileWriteCount = 0
  currentSubject = 'user:account-a'
  reloadedLab.configureEmotionLabMockRuntime(
    storage,
    () => currentSubject,
    (profileSource, subjectId) => {
      reloadedProfileWriteCount += 1
		return reloadedUser.syncMockMeMbtiProfileData(profileSource, subjectId)
    }
  )
  openFixtureAssessment(reloadedLab, questions)
  const restoredA = reloadedLab.getEmotionLabSummaryData()
  assert.strictEqual(restoredA.activeSession.id, accountACompleted.id, 'draft/result should survive module reload')
  assert.strictEqual(restoredA.activeSession.result.id, accountACompleted.result.id)
  assert.strictEqual(restoredA.profileSource.source, 'assessment')
	assert.strictEqual(reloadedUser.getMockMeMbtiProfileData('user:account-a').mbti, accountACompleted.result.mbtiType)
	assert.strictEqual(reloadedUser.getMockMeMbtiProfileData('user:account-a').mbtiSource, 'assessment')
  assert.strictEqual(reloadedProfileWriteCount, 0, 'restoring a summary must not replay a profile write')

  currentSubject = 'user:account-b'
  const restoredB = reloadedLab.getEmotionLabSummaryData()
  assert.strictEqual(restoredB.activeSession, null, 'account B result state should remain independent after reload')
  assert.strictEqual(restoredB.profileSource.mbtiType, 'ENFP')
	assert.strictEqual(reloadedUser.getMockMeMbtiProfileData('user:account-b').mbti, 'ENFP')
  assert.strictEqual(reloadedProfileWriteCount, 0)

  currentSubject = 'user:account-c'
  const restoredC = reloadedLab.getEmotionLabSummaryData()
  assert.strictEqual(restoredC.activeSession.status, 'in_progress')
  assert.deepStrictEqual(restoredC.activeSession.answers, accountCDraft.answers)
  assert.deepStrictEqual(restoredC.activeSession.questionIds, accountCDraft.questionIds)
  assert.deepStrictEqual(restoredC.activeSession.questions, accountCDraft.questions)
  const continuedC = reloadedLab.saveEmotionLabAnswersData(accountCSession.id, [
    { questionId: questions[1].id, value: 2 }
  ])
  assert.strictEqual(continuedC.answers.length, 2, 'reloaded in-progress draft should remain writable')

  openFixtureAssessment(lab, questions)
  currentSubject = 'user:revoked-save'
  const revokedSaveSession = lab.startEmotionLabSessionData('mbti-core')
  currentSubject = 'user:revoked-submit'
  const revokedSubmitSession = lab.startEmotionLabSessionData('mbti-core')
  currentSubject = 'user:revoked-summary'
  const revokedSummarySession = lab.startEmotionLabSessionData('mbti-core')
  currentSubject = 'user:closed-draft'
  const closedDraftSession = lab.startEmotionLabSessionData('mbti-core')
  currentSubject = 'user:stale-version'
  const staleVersionSession = lab.startEmotionLabSessionData('mbti-core')
  lab.mockMbtiAssessmentDefinition.authorization.status = 'rejected'
  lab.mockMbtiAssessmentDefinition.canStart = false

  currentSubject = 'user:revoked-save'
  expectThrows(() => lab.saveEmotionLabAnswersData(revokedSaveSession.id, [
    { questionId: questions[0].id, value: 5 }
  ]), 'ASSESSMENT_REVIEW_REQUIRED')
  assert.strictEqual(lab.getEmotionLabSummaryData().activeSession, null, 'revoked save draft must be cleared')

  currentSubject = 'user:revoked-submit'
  expectThrows(
    () => lab.submitEmotionLabSessionData(revokedSubmitSession.id, answersFavoringFirstPole(questions)),
    'ASSESSMENT_REVIEW_REQUIRED'
  )
  assert.strictEqual(lab.getEmotionLabSummaryData().activeSession, null, 'revoked submit draft must be cleared')

  currentSubject = 'user:revoked-summary'
  const revokedSummary = lab.getEmotionLabSummaryData()
  assert.strictEqual(revokedSummary.activeSession, null, 'summary must not expose revoked draft questions')
  expectThrows(
    () => lab.saveEmotionLabAnswersData(revokedSummarySession.id, [
      { questionId: questions[0].id, value: 5 }
    ]),
    'SESSION_NOT_FOUND'
  )

  lab.mockMbtiAssessmentDefinition.authorization.status = 'verified'
  lab.mockMbtiAssessmentDefinition.canStart = false
  currentSubject = 'user:closed-draft'
  expectThrows(() => lab.saveEmotionLabAnswersData(closedDraftSession.id, [
    { questionId: questions[0].id, value: 5 }
  ]), 'ASSESSMENT_NOT_OPEN')
  assert.strictEqual(lab.getEmotionLabSummaryData().activeSession, null)

  openFixtureAssessment(lab, questions)
  const originalDefinitionVersion = lab.mockMbtiAssessmentDefinition.version
  lab.mockMbtiAssessmentDefinition.version = originalDefinitionVersion + '-replacement'
  currentSubject = 'user:stale-version'
  expectThrows(
    () => lab.submitEmotionLabSessionData(staleVersionSession.id, answersFavoringFirstPole(questions)),
    'ASSESSMENT_VERSION_UNAVAILABLE'
  )
  assert.strictEqual(lab.getEmotionLabSummaryData().activeSession, null)
  lab.mockMbtiAssessmentDefinition.version = originalDefinitionVersion

  openFixtureAssessment(lab, questions)
  currentSubject = 'user:legacy-snapshot'
  lab.startEmotionLabSessionData('mbti-core')
  const legacyStorageKey = lab.EMOTION_LAB_STORAGE_PREFIX + encodeURIComponent(currentSubject)
  const legacyState = storage.getItem(legacyStorageKey)
  delete legacyState.activeSession.schemaVersion
  for (const key of legacyState.activeSession.scoringKeys) delete key.optionValues
  storage.setItem(legacyStorageKey, legacyState)
  assert.strictEqual(
    lab.getEmotionLabSummaryData().activeSession,
    null,
    'legacy drafts without the allowed-option snapshot must be cleared instead of exposed'
  )
  openFixtureAssessment(lab, questions)

  expectThrows(() => lab.setEmotionLabProfileSourceData({
    mbtiType: firstResult.result.mbtiType,
    source: 'assessment',
    confirmed: true,
    resultId: 'forged-result'
  }), 'ASSESSMENT_RESULT_REQUIRED')

  const discarded = lab.discardMbtiSessionSnapshot(
    lab.createMbtiSessionSnapshot(definition, questions, 'mbti-session-discard')
  )
  assert.strictEqual(discarded.status, 'discarded')

  const api = fs.readFileSync(apiPath, 'utf8')
  assert.ok(api.includes('export const EMOTION_LAB_USE_MOCK = USE_MOCK'), 'API must follow the explicit project data-mode boundary')
  assert.ok(api.includes('configureEmotionLabMockRuntime'), 'API should configure the cross-platform storage boundary')
  assert.ok(
    api.includes('uni.getStorageSync(CURRENT_USER_ID_KEY)'),
    'API should resolve emotion state from the shared authenticated user id key'
  )
  assert.ok(api.includes('syncMockMeMbtiProfileData'), 'API should use the unified Mock user profile writer')
  assert.ok(api.includes('EMOTION_LAB_SUBJECT_REQUIRED'), 'API should fail closed when xsa_user_id is missing')
  assert.ok(!api.includes("return 'mock-user:9001'"), 'API must not share a fixed fallback subject across accounts')
  assert.match(
    api,
    /export async function getEmotionLabSummary\(\)\s*\{\s*if \(EMOTION_LAB_USE_MOCK\)\s*\{\s*try \{/s,
    'summary should convert Mock storage/profile failures into the shared business failure response'
  )
  assert.match(
    api,
    /url:\s*['"]\/emotion-lab\/summary['"][\s\S]*?mockData:\s*null/,
    'the real summary path must not eagerly evaluate account-scoped Mock data'
  )
  for (const typeName of [
    'AssessmentDefinition',
    'AssessmentSessionSnapshot',
    'SessionSnapshot',
    'MbtiResult',
    'ResultCopy'
  ]) {
    assert.ok(api.includes(`export type ${typeName}`), `API should export ${typeName}`)
  }
  for (const functionName of [
    'getEmotionLabSummary',
    'startMbtiAssessment',
    'saveMbtiAnswer',
    'submitMbtiAssessment',
    'setMyMbtiType',
    'discardMbtiDraft',
    'startEmotionLabSession',
    'saveEmotionLabAnswers',
    'submitEmotionLabSession',
    'setEmotionLabProfileSource',
    'discardEmotionLabSession'
  ]) {
    assert.ok(api.includes(`export async function ${functionName}`), `API should export ${functionName}`)
  }
  for (const endpoint of ['/emotion-lab/summary', '/emotion-lab/sessions', '/answers', '/submit', '/profile-source']) {
    assert.ok(api.includes(endpoint), `API should define ${endpoint}`)
  }

  const apiIndex = fs.readFileSync(apiIndexPath, 'utf8')
  for (const typeName of [
    'AssessmentDefinition',
    'AssessmentQuestionSnapshot',
    'AssessmentSessionSnapshot',
    'MbtiAnswer',
    'MbtiDimensionKey',
    'MbtiDimensions',
    'MbtiResult',
    'ResultCopy',
    'ProfileMbtiSource',
    'SetMyMbtiTypePayload'
  ]) {
    assert.ok(apiIndex.includes(typeName), `unified API should re-export ${typeName}`)
  }

  const userMock = fs.readFileSync(userMockPath, 'utf8')
  assert.ok(
		userMock.includes("export function syncMockMeMbtiProfileData(profileSource: any, subjectId: string = ''): any {"),
    'Mock user data should expose a single MBTI profile write boundary'
  )
	assert.ok(userMock.includes('export function getMockMeMbtiProfileData'), 'Mock profile reads should resolve by subject')
	assert.ok(userMock.includes('MOCK_ME_MBTI_STORAGE_PREFIX'), 'Mock profile sources should persist by subject')

  const authApi = fs.readFileSync(authApiPath, 'utf8')
  const configApi = fs.readFileSync(configApiPath, 'utf8')
  assert.match(
    authApi + '\n' + configApi,
    /removeStorageSync\((?:CURRENT_USER_ID_KEY|USER_ID_KEY|['"]xsa_user_id['"])\)/,
    'logout token cleanup must clear xsa_user_id so the previous subject cannot leak'
  )
  assert.ok(authApi.includes('res.data.user_id'), 'login should read the authenticated user id')
  assert.match(
    authApi,
    /(?:setCurrentUserId\(|setStorageSync\((?:CURRENT_USER_ID_KEY|USER_ID_KEY|['"]xsa_user_id['"]),)/,
    'login should persist xsa_user_id when the response includes user_id'
  )

  const page = fs.readFileSync(pagePath, 'utf8')
  for (const required of [
    '情感实验室',
    'mbti-core@2',
    '内容已授权',
    '内容授权待审核',
    '审核完成前不可开始',
    '手动选择 16 型',
    '我确认将此自填类型同步到资料',
    'disclaimerText',
    'disclaimerVersion',
    'self_reported',
    'assessment',
    "viewState == 'intro'",
    "viewState == 'questions'",
    "viewState == 'result'",
    "viewState == 'manual'",
    '继续测试',
    'saveMbtiAnswer',
    'submitMbtiAssessment',
    'discardMbtiDraft',
    '放弃本次测试',
    'allAnswersComplete'
  ]) {
    assert.ok(page.includes(required), `page should include ${required}`)
  }
  for (const forbidden of ['荣格', '九型', 'H/C', '匹配', '分享', 'AI 生成']) {
    assert.ok(!page.includes(forbidden), `page should not include ${forbidden}`)
  }
  assert.ok(page.includes("from '@/api'"), 'page should use the unified API entry')
  assert.ok(!page.includes("from '@/api/emotionLab.uts'"), 'page should not bypass the unified API entry')
  assert.ok(!page.includes('window.'), 'page should not use window')
  assert.ok(!page.includes('document.'), 'page should not use document')
  assert.ok(!page.includes('localStorage'), 'page should use UniApp storage through the data layer')
  assert.ok(page.includes('{{ disclaimerText }}'), 'page should render the versioned disclaimer from API data')
  assert.match(
    page,
    /const continueAssessment = \(\) => \{[^}]*!canStartAssessment\.value/s,
    'the page must refuse to continue a draft when the assessment is no longer authorized'
  )
  assert.ok(
    page.includes('result.resultCopy.disclaimer'),
    'completed results should provide the first-priority disclaimer copy'
  )
  assert.ok(page.includes('summary.value.disclaimer'), 'summary should provide the fallback disclaimer copy')
  assert.ok(page.includes('summary.value.disclaimerVersion'), 'summary fallback should preserve copy version')
  assert.doesNotMatch(page, /border-(?:left|right)\s*:/, 'emotion lab should not use decorative side rules')
  assert.doesNotMatch(page, /border-radius:\s*6px/, 'emotion lab should use the established control and card radii')
  assert.ok(page.includes('height: 48px'), 'manual MBTI choices should provide stable touch targets')
  assert.match(
    page,
    /\.confirm-row\s*\{[^}]*min-height:\s*44px/s,
    'confirmation rows should provide a 44px touch target'
  )
  for (const selector of ['primary-button', 'secondary-button', 'type-option', 'answer-option', 'text-button']) {
    assert.match(
      page,
      new RegExp(`\\.${selector}\\s*\\{[^}]*min-height:\\s*(?:44|48)px`, 's'),
      `${selector} should provide at least a 44px touch target`
    )
  }

  for (const stateName of [
    'viewState',
    'activeSession',
    'answeredCount',
    'currentQuestionIndex',
    'currentQuestion',
    'currentOptions',
    'currentAnswerValue',
    'progressPercent',
    'progressMessage',
    'savingAnswer',
    'submitting',
    'allAnswersComplete'
  ]) {
    assert.match(
      page,
      new RegExp(`const\\s+${stateName}\\s*=\\s*(?:ref|computed)\\s*\\(`),
      `page should declare reactive state ${stateName}`
    )
  }

  for (const handlerName of [
    'continueAssessment',
    'requestDiscardDraft',
    'openResult',
    'openManualSettings',
    'selectAnswer',
    'previousQuestion',
    'nextQuestion',
    'submitAssessment',
    'backToIntro'
  ]) {
    assert.match(
      page,
      new RegExp(`(?:const\\s+${handlerName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>|function\\s+${handlerName}\\s*\\()`),
      `page should declare handler ${handlerName}`
    )
  }

  for (const apiCall of ['saveMbtiAnswer', 'submitMbtiAssessment', 'discardMbtiDraft']) {
    assert.match(page, new RegExp(`\\b${apiCall}\\s*\\(`), `page should call ${apiCall}`)
  }

	const userEditPage = fs.readFileSync(userEditPath, 'utf8')
	assert.ok(userEditPage.includes('getEmotionLabSummary'), 'profile editor should read the confirmed MBTI source through the unified API')
	assert.ok(userEditPage.includes('result.data.profileSource'), 'profile editor should only consume the explicit profile source')
	assert.ok(userEditPage.includes("sourceType != 'assessment' && sourceType != 'self_reported'"), 'profile editor should reject unknown MBTI sources')
	assert.ok(userEditPage.includes("onShow(() =>"), 'profile editor should refresh confirmed MBTI after returning from the lab')
	assert.ok(userEditPage.includes("uni.navigateTo({ url: '/pages/emotion-lab/emotion-lab' })"), 'the MBTI profile row should use the emotion-lab setting flow')
	assert.ok(!userEditPage.includes("showFieldEditor('mbti')"), 'profile editor should not keep an untracked MBTI write path')
	assert.ok(!userEditPage.includes("formData.mbti || 'ENFJ'"), 'profile editor should not render a hard-coded fallback MBTI')
	assert.ok(userEditPage.includes("mbti: ''"), 'profile editor should start without an unconfirmed MBTI')
	const indexPage = fs.readFileSync(path.join(root, 'pages/index/index.uvue'), 'utf8')
	assert.ok(!indexPage.includes('class="ai-mbti-row"'), 'AI match UI should not present hard-coded MBTI identities')

  console.log('情感实验室 MBTI 契约与计分测试通过')
	delete globalThis.uni
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
