import { WALLETS, WalletType, log } from './utils';

import inquirer from 'inquirer';
import recipeJson from '../src/resources/receipt.json';
import { runRecipe } from './receipt';

let recipe: JSON = {} as JSON;

(async () => {
  log.info('Receipt starting ...');
  recipe = JSON.parse(JSON.stringify(recipeJson));

  const { choice }: { choice: WalletType } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select wallet type for process:',
      choices: ['main', 'ref', 'all'],
      default: 'main',
      name: 'choice',
    },
  ]);

  await Promise.all([runRecipe(await WALLETS(choice), recipe)]);
})();
