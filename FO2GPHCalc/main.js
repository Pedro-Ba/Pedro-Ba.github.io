let BOSSLIST = [
    "Lucky Skull Spider",
    "Skele Champion",
    "Boulder Colorado",
    "The Alpha",
    "Mcbadguy Redux",
    "Destroyer of Will",
    "Destroyer of Mind",
    "Destroyer of Faith",
    "Anubis",
    "Gamer's Head",
    "Gamer's Right Hand",
    "Gamer's Left Hand",
    "Stuff of Nightmares",
    "Bearserker",
    "The Badger King",
    "The Dark Elf King",
    "Evil McFreezeGuy",
    "Devilish Star",
    "Flying Dutchman",
    "The Kraken",
    "Troglodyte Scourge",
    "Froctopus",
    "Chat",
    "Cat",
    "Wild Turkey",
    "Alrahur",
    "The Future",
    "Elder of the Dead",
    "Lord of the Dead",
    "Rotten Overlord",
    "Evil Pie",
    "Taunted Throne",
    "Gen. Biodegradable",
    "Sea Snake",
    "Grave",
    "Tombstone"
];
//I really need to make this a tiny bit better. Grave and Tombstone ain't even bosses, these are fucking veins. Isn't there a "only hurtable by Pickaxe" variable? Fucks sake.
//Elder and Lord are not actually bosses but they are not farmable due to low amount.
let allMobs = [];

const bosslistLowerCase = BOSSLIST.map(name => name.toLowerCase());

function binomialCoefficient(n, k) {
    if (k > n) return 0;
    let res = 1;
    for (let i = 0; i < k; i++) {
        res *= (n - i);
        res /= (i + 1);
    }
    return res;
}

function binomialProbability(events, range, prob) {
    const complement = 1 - prob;
    const coefficient = binomialCoefficient(range, events);
    return coefficient * Math.pow(prob, events) * Math.pow(complement, range - events);
}

function ProbabilityAtLeastNinK(events, range, prob){
    let sum = 0;
    for(let numEvents = events; numEvents <= range; numEvents++){
        sum = sum + binomialProbability(numEvents, range, prob);
    }
    return sum;
}

function CalculateActualProbabilities(HPK, prob){ 
    let arrayOfProbabilities = [];
    let range = Math.ceil(HPK/2);
    let events = Math.floor(HPK/2);
    for(events; events > 0; events--, range++){        
        arrayOfProbabilities.push(ProbabilityAtLeastNinK(events, range, prob));
    }
    arrayOfProbabilities.push(binomialProbability(events, range-1, prob));
    let realProbabilities = [];
    realProbabilities.push(arrayOfProbabilities[0]);
    for(let i = 1; i < arrayOfProbabilities.length - 1; i++){
        realProbabilities.push(arrayOfProbabilities[i] - arrayOfProbabilities[i-1]);
    }
    realProbabilities.push(arrayOfProbabilities[arrayOfProbabilities.length-1]);
    return realProbabilities;
}


async function populateMobs(){
    const files = ['./allMobsAndItemStacksize.json'];
    let allMobs = [];
    const fetchPromises = files.map(file => 
        fetch(`${file}`)
            .then(response => response.json())
            .then(data => {
                allMobs = allMobs.concat(data);
            })
            .catch(error => {
                console.error('Error fetching file:', error);
            })
    );
    await Promise.all(fetchPromises);
    return allMobs;
}

async function calculatesStuff(){
    const playerLevel = parseInt(document.getElementById('Player Level').value);
    const playerHP = parseInt(document.getElementById('Player HP').value);
    const armor = parseInt(document.getElementById('Armor').value);
    const hpRegen = parseInt(document.getElementById('HP Regen').value);
    const lowestDmg = parseInt(document.getElementById('LowestDmg').value);
    const highestDmg = parseInt(document.getElementById('HighestDmg').value);
    const attackSpd = parseFloat(document.getElementById('AttackSpd').value);
    const crit = parseFloat(document.getElementById('Crit').value)/100;
    const dodge = parseFloat(document.getElementById('Dodge').value)/100;
    const avgDmgPerHit = (lowestDmg + highestDmg)/2;
    console.log('Player Level:', playerLevel);
    console.log('Player HP:', playerHP);
    console.log('Armor:', armor);
    console.log('HP Regen:', hpRegen);
    console.log('Lowest Damage:', lowestDmg);
    console.log('Highest Damage:', highestDmg);
    console.log('Attack Speed:', attackSpd);
    console.log('Crit:', crit);
    console.log('Dodge:', dodge);
;
    if (allMobs.length == 0) allMobs = await populateMobs();
    
    console.log(allMobs); //we have all mobs.

    let mobAndGold = [];
    //each object of array contains id, name, desc?, HEALTH OBV, level, goldMax, goldMin, atkSpeed, dmgMin, dmgMax, some other worthless stuff; then the important part, numSpawns, spawnTimeSec, DROPS.
    const timingWindow = 3600;
    for (mob of allMobs){
        let estimatedClicks = 0;
        //calculate mob gold
        
        let name = mob['name'].toLowerCase();
        if(name.includes('chest') || name.includes('vein') || name.includes('crate') || bosslistLowerCase.includes(name)){
            continue;
        }
        let locations = mob['locations'];
        if (locations[0]?.area?.id == 13 || locations[0]?.area?.id == 9){
            continue;
        }

        //console.log(`Calculating for ${mob['name']}`);
        let baseHitsPerKill = Math.ceil(mob['health']/avgDmgPerHit); 
        let actualHPK = 0;
        if(baseHitsPerKill < 500){
            let arrayOfProbs = CalculateActualProbabilities(baseHitsPerKill, crit);
            for(let probCalcHelper = Math.ceil(baseHitsPerKill/2), i = 0; probCalcHelper <= baseHitsPerKill; probCalcHelper++, i++){
                actualHPK += arrayOfProbs[i] * probCalcHelper; //I think it's this?
            }
        }
        else{
            actualHPK = baseHitsPerKill;
        }        
        //console.log(actualHPK);
        let totalItemSlotsNeeded = 0;
        let mobTTK = Math.max((actualHPK - 1) * attackSpd, 1.5); //new mob TTK is dependant on the dmg speed of your hits. -1 because first attack is always free (autoattack reset);
        let mobsPerHour = timingWindow/mobTTK; //unchanged? Might still need Math.Ceil to compensate for overkilling?;
        estimatedClicks = 3 * mobsPerHour; //2 clicks to attack each mob, 1 to loot it
        let rawGoldKillPerHour = ((mob['goldMin'] + mob['goldMax'])/2) * mobsPerHour;
        let goldFromDrops = 0;
        for (drop of mob['drops']){
            let dropRate = drop['dropRate']/100;
            let price = drop['item']['sellPrice'];
            let totalItemsPerHour = mobsPerHour * dropRate * drop['count']; //just add count, I mean, if it can drop 3 times... right?
            totalItemSlotsNeeded += totalItemsPerHour/drop['item']['stacksize'];
            let totalItemValue = totalItemsPerHour * price;
            goldFromDrops += totalItemValue;
            estimatedClicks += 1 * dropRate * drop['count'];
        }
        let totalGoldPerHour = rawGoldKillPerHour + goldFromDrops;
        //console.log(`${mob['name']} TTK: ${mobTTK}. Total mobs killed per hour: ${timingWindow/mobTTK}. Gold per hour, no items: ${rawGoldKillPerHour}. Gold just from items: ${goldFromDrops}. Total Gold per Hour: ${totalGoldPerHour}`);
        //calculate mob dmg
        let mobDmgAvg = (mob['dmgMin'] + mob['dmgMax']) / 2;
        let mobDmgTaken = (mobDmgAvg * ((200 + playerLevel*50) / ((200 + playerLevel*50)+armor))) * (1-dodge); 
        let mobDmgPerKill = mobDmgTaken * (actualHPK - 1);
        let effectiveDmgTakenPerKill = mobDmgPerKill - hpRegen;
        let mobsUntilPlayerDies;
        if(effectiveDmgTakenPerKill <= 0){
            mobsUntilPlayerDies = "Can't die to this";
        }
        else{
            mobsUntilPlayerDies = (playerHP/effectiveDmgTakenPerKill).toFixed(2);
        }

        //push all info to array
        mobAndGold.push({
            "name": mob['name'], 
            "GPH": totalGoldPerHour.toFixed(2), 
            "TTK": mobTTK.toFixed(2), 
            "HPK": actualHPK.toFixed(2), 
            "MobDPK": mobDmgPerKill.toFixed(2), 
            "Mobs until death": mobsUntilPlayerDies, 
            "Clicks per Hour": estimatedClicks.toFixed(2),
            "Item Slots Needed": totalItemSlotsNeeded.toFixed(2)
        });
    }
    let sortedMobAndGold = mobAndGold.sort((a, b) => b.GPH - a.GPH);
//  for (sortedItem of sortedMobAndGold){
//      console.log(sortedItem);
//  }
    const resultDiv = document.getElementById('response');
    resultDiv.innerHTML = '';
    const table = document.createElement('table');
    table.classList.add('mob-table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Name', 'Gold Per Hour', 'Time To Kill(sec)', 'Hits Per Kill', 'Mob Damage Per Kill', 'Mobs until Death', 'Clicks per Hour', 'Item Slots Needed']
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    sortedMobAndGold.forEach(sortedItem => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = sortedItem.name;
        row.appendChild(nameCell);

        const gphCell = document.createElement('td');
        gphCell.textContent = sortedItem.GPH;
        row.appendChild(gphCell);

        const ttkCell = document.createElement('td');
        ttkCell.textContent = sortedItem.TTK;
        row.appendChild(ttkCell);

        const hpkCell = document.createElement('td');
        hpkCell.textContent = sortedItem.HPK;
        row.appendChild(hpkCell);

        const mobDpkCell = document.createElement('td');
        mobDpkCell.textContent = sortedItem.MobDPK;
        row.appendChild(mobDpkCell);

        const mobsUntilDeathCell = document.createElement('td');
        mobsUntilDeathCell.textContent = sortedItem['Mobs until death'];
        row.appendChild(mobsUntilDeathCell);

        const clicksPerHourCell = document.createElement('td');
        clicksPerHourCell.textContent = sortedItem['Clicks per Hour'];
        row.appendChild(clicksPerHourCell);

        const itemSlotsNeededCell = document.createElement('td');
        itemSlotsNeededCell.textContent = sortedItem['Item Slots Needed'];
        row.appendChild(itemSlotsNeededCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultDiv.appendChild(table);
}
