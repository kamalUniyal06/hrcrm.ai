// Prototype curriculum. Replace these objects with the published lessons later.
const topics = [
  ['Welcome to your workspace', 'Build a strong foundation for your everyday work.', ['Find your way around', 'Make it your own', 'Your first workflow']],
  ['Know your contacts', 'Turn scattered information into useful relationships.', ['Create a contact', 'Organize with purpose', 'Keep a useful history']],
  ['Build your pipeline', 'Give every opportunity a clear next step.', ['Understand your stages', 'Add an opportunity', 'Plan the next action']],
  ['Conversations that connect', 'Keep your outreach thoughtful and organized.', ['Prepare your message', 'Track the conversation', 'Follow up thoughtfully']],
  ['From opportunity to order', 'Keep the details moving as your work grows.', ['Capture the essentials', 'Track an order', 'Review your handoff']],
  ['Make routine work easier', 'Create a repeatable rhythm for your team.', ['Spot repetitive work', 'Design a checklist', 'Review your routine']],
  ['Focus on what matters', 'Find the next best action in a busy workspace.', ['Recognize priority signals', 'Review your opportunities', 'Create an action plan']],
  ['Bring it all together', 'Put your new skills into a complete workflow.', ['Your practice scenario', 'Review your workflow', 'Build your daily habit']],
];

export const trainingDays = topics.map(([title, description, lessons], index) => ({
  id: index + 1, title, description,
  lessons: lessons.map((name, lessonIndex) => ({
    id: `${index + 1}-${lessonIndex}`, title: name, minutes: 4 + lessonIndex,
    intro: `In this lesson, you’ll practice how to ${name.toLowerCase()}. A few intentional steps can make your workspace clearer and your next action easier to find.`,
    steps: [
      { title: 'Start with a clear outcome', text: `Before you ${name.toLowerCase()}, decide what a successful result should look like. Choose one small, specific outcome to work toward.` },
      { title: 'Give the work some context', text: 'Use a practice record. Add a clear description, assign an owner, and capture the details another teammate would need to pick up where you left off.' },
      { title: 'Choose your next action', text: 'Review what you have added, check for missing information, and write down a concrete follow-up. Small, consistent actions keep work moving.' },
    ],
    exercise: `Imagine you are showing a new teammate how to ${name.toLowerCase()}. Write down the first action you would take and explain why it matters.`,
  })),
  questions: [
    { prompt: `Before you start with “${lessons[0]}”, what should you do?`, options: ['Choose a clear outcome', 'Change every setting at once', 'Skip straight to the next day'], correct: 0, explanation: 'A clear outcome helps you focus and makes it easier to check your work.' },
    { prompt: 'What makes a useful handoff to a teammate?', options: ['Only a record name', 'Context, an owner, and a next action', 'Leaving the details for later'], correct: 1, explanation: 'Context, ownership, and a next action help someone continue the work confidently.' },
    { prompt: 'How should you finish your practice session?', options: ['Leave without reviewing', 'Start several unrelated tasks', 'Review the details and plan a follow-up'], correct: 2, explanation: 'A quick review and a specific follow-up turn practice into a repeatable habit.' },
  ],
}));
