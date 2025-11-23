
const description = `EASY CHICKEN CURRY - A spicy Chicken in gravy is a perfect solution for the 'special' cravings at dinner hours. Watch the complete video and learn how to prepare this Super easy Chicken curry, step by step.

***********************
𝗔𝗠𝗔𝗭🥘𝗡  𝗦𝗛🍳𝗣
🔪Knives I use - https://amzn.to/41Z6eUg
🛒RB Store - https://www.amazon.in/shop/chefranveer
📟Kitchen Appliances - https://bit.ly/KitchenAppliancesIUse
***********************

Let's help 𝘽𝙖𝙣𝙙𝙚𝙡 𝘾𝙝𝙚𝙚𝙨𝙚 get its GI Tag 
𝗖𝗹𝗶𝗰𝗸 𝗵𝗲𝗿𝗲 𝘁𝗼 𝘀𝗶𝗴𝗻 𝗺𝘆 𝗽𝗲𝘁𝗶𝘁𝗶𝗼𝗻 - https://change.org/GITagforBandelCheese

***********************
⏩𝓒𝓵𝓲𝓬𝓴  𝓽𝓸  𝓢𝓾𝓫𝓼𝓬𝓻𝓲𝓫𝓮 : https://goo.gl/UE2pmL
***********************

𝗖𝗵𝗲𝗰𝗸 𝗼𝘂𝘁 𝘁𝗵𝗲𝘀𝗲 𝗿𝗲𝗰𝗶𝗽𝗲𝘀 𝘁𝗼𝗼: https://bit.ly/ChickenRecipesbyRB

***********************
For more fantastic recipes, check out the Ranveer Brar App 📲
📲𝐀𝐧𝐝𝐫𝐨𝐢𝐝 - http://bit.ly/RBAppAndroid
📲𝗶𝗢𝗦 - http://bit.ly/RBAppiOS
***********************

EASY CHICKEN CURRY
Preparation Time: 15 minutes
Cooking Time: 30 minutes
Serves: 4

Ingredients:
For Marination 🍛

750 gms chicken on bone, curry cut 
½ cup yogurt, beaten 
Salt to taste 
2-3 green chillies, slit 
½ tsp turmeric powder 
1 tsp red chilli powder 
1 tsp coriander powder 
2 green cardamom pods
2 cloves

For Curry 🥙

1 tbsp ghee 
½ tbsp oil 
1 black cardamom, crushed 
3-4 bay leaves 
1 tsp cumin seeds 
2 cloves 
1 tbsp ginger, chopped 
6-7 garlic cloves, roughly crushed 
5-6 medium onions, finely chopped 
¼ tsp turmeric powder (roast) 
Salt to taste 
1½ tsp coriander powder 
1 tsp red chilli powder
2 medium tomatoes, finely chopped 
2 tbsp ghee 
Coriander sprig for garnish 🍛

Process ♨️

• Add chicken, yogurt, salt, green chillies, turmeric powder, red chilli powder, coriander powder, cardamom powder and cloves. Mix well. Set aside to marinate for 15-20 minutes. 
• Heat ghee in a pan, add some oil as well. Add black cardamom, bay leaves, cumin seeds and cloves. Saute till fragrant. 
• Add ginger and garlic, saute till fragrant. Add onions and saute till they turn brown. 
• Add turmeric powder and roast for 2 minutes. Add salt and mix well. Add coriander powder and roast for 2 minutes. 
• Add chilli powder, mix well and roast for 2 minutes. Add some water, mix well and cook for a few minutes. 
• Add the tomatoes, mix well. Cover and cook till tomatoes leave their oil. 
• Add the marinated chicken and mix well. Cook till ghee starts floating on top. 
• Add some water, mix well. Cover and cook till the chicken is done. 
• Garnish with coriander and serve hot with rice or roti.


***********************
For more fantastic recipes, check out the Ranveer Brar App:
📲𝐀𝐧𝐝𝐫𝐨𝐢𝐝 - http://bit.ly/RBAppAndroid
📲𝗶𝗢𝗦 - http://bit.ly/RBAppiOS
***********************

🌎 Follow Ranveer Brar here too:
➡️ https://www.ranveerbrar.com
➡️      / ranveerbrar  
➡️      / ranveer.brar  
➡️      / ranveerbrar  

#chickencurry #chickenrecipe #ranveerbrar 
#ranveerbrarchickencurry #spicychicken #chickendinner #punjabichickengravy #punjabichickencurry`;

function parseRecipe(recipeText) {
    const recipe = {
        title: 'Extracted Recipe',
        ingredients: [],
        instructions: []
    };

    const lines = recipeText.split('\n').filter(line => line.trim());

    // Look for ingredients section
    const ingredientsStart = lines.findIndex(line =>
        /ingredients?/i.test(line)
    );

    console.log('Ingredients start index:', ingredientsStart);

    if (ingredientsStart !== -1) {
        const instructionsStart = lines.findIndex((line, idx) =>
            idx > ingredientsStart && /instructions?|directions?|steps?|process/i.test(line)
        );

        console.log('Instructions start index:', instructionsStart);
        if (instructionsStart !== -1) {
            console.log('Instructions start line:', lines[instructionsStart]);
        }

        const ingredientsEnd = instructionsStart !== -1 ? instructionsStart : lines.length;

        console.log('Ingredients end index:', ingredientsEnd);

        recipe.ingredients = lines
            .slice(ingredientsStart + 1, ingredientsEnd)
            .filter(line => {
                const trimmed = line.trim();
                if (!trimmed) return false;

                // Filter out section headers
                if (/^(instructions?|directions?|steps?|process|method|for\s+(marination|curry|sauce|dressing|garnish|topping|filling|base|mixture)):?$/i.test(trimmed)) {
                    console.log('Filtered out section header:', trimmed);
                    return false;
                }

                // Filter out numbered steps
                if (/^\d+[.)]\s/.test(trimmed)) {
                    console.log('Filtered out numbered step:', trimmed);
                    return false;
                }

                // Filter out lines that start with action verbs

                return true;
            })
            .map(line => line.replace(/^[-•*]\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    return recipe;
}

const result = parseRecipe(description);
console.log('Result:', JSON.stringify(result, null, 2));
