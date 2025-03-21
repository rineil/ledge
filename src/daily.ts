import { WalletType, getAccountWithIP } from './utils';

import inquirer from 'inquirer';
import recipeJson from '../src/resources/receipt.json';
import { runRecipe } from './receipt';

(async () => {
  const recipe: JSON = JSON.parse(JSON.stringify(recipeJson));
  const { choice }: { choice: WalletType } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select wallet type for process:',
      choices: ['main', 'ref', 'all'],
      default: 'main',
      name: 'choice',
    },
  ]);

  const accounts: Record<string, object> = await getAccountWithIP(choice);
  await Promise.all([runRecipe(accounts, recipe)]);
})();
