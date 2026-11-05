/* Homepage browsing groups. Resource categories and guide URLs retain their original contract. */
(function (global) {
  'use strict';
  const collections = [
    {id:'create', title:'Create content', description:'Make videos, images, and posts that feel like you.'},
    {id:'work', title:'Work smarter', description:'Better prompts, useful systems, and a clearer week.'},
    {id:'money', title:'Save & earn', description:'Find savings, compare tools, and explore business ideas.'},
    {id:'everyday', title:'Everyday life', description:'Small shortcuts for home, travel, and the things you use.'},
    {id:'learn', title:'Study & print', description:'Study prompts and printables to put straight to use.'}
  ];
  const assignments = {
    'on-device-ai-journal':'everyday',
    'higgsfield-ai-clips-for-reels':'create', 'chatgpt-image-codes':'create', 'meta-avatar-prompt-pack':'create',
    'use-meta-muse-effectively':'work', 'ai-video-learning':'work', 'tree-quote-agent':'work',
    'automation-opportunity-audit':'work', 'better-ai-prompts':'work', 'plan-your-week-with-chatgpt':'work',
    'si-domain-resale-guide':'money', 'open-source-subscription-swaps':'money',
    'meta-muse-marketplace':'money', 'chatgpt-email-savings-monitor':'money',
    'set-up-noop-whoop':'everyday', 'google-flight-deals':'everyday', 'meal-prep-with-chatgpt':'everyday',
    'ai-for-parents-three-easy-ways':'everyday', 'general-conference-activity-workbook':'learn', 'chatgpt-study-prompts':'learn'
  };
  const categoryDefaults = {
    'Creator Tools':'create', 'Free Prompt Pack':'create', 'AI + Automation':'work',
    'Online Business':'money', 'Lifestyle':'everyday', 'Travel Smarter':'everyday', 'Travel':'everyday',
    'Study Smarter':'learn', 'Study':'learn', 'Free Printable':'learn'
  };
  function collectionFor(item) {
    const id = (Object.hasOwn(assignments,item.slug) && assignments[item.slug]) || (Object.hasOwn(categoryDefaults,item.category) && categoryDefaults[item.category]) || 'work';
    return collections.find(collection => collection.id === id);
  }
  const api = {collections, assignments, collectionFor};
  global.BrambleLibrary = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
