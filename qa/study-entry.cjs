const assert = require('node:assert/strict');

// Complete the public study opt-out and guest entry before testing a workspace.
async function skipStudyQuestionnaire(page) {
  const questionnaire = page.locator('#cbse-questionnaire[open]');
  await questionnaire.waitFor({state: 'visible'});
  await questionnaire.getByRole('button', {name: 'Skip for now', exact: true}).click();
  await questionnaire.waitFor({state: 'hidden'});
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('peq_cbse_study_v1'))), {v: 1, status: 'skipped'});
  const landing = page.locator('#lnd');
  await landing.getByRole('button', {name: /^Start Exploring/}).click();
  await landing.waitFor({state: 'hidden'});
}

module.exports = {skipStudyQuestionnaire};
