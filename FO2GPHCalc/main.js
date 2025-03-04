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
    "Troglodyte Scourge"
];

const bosslistLowerCase = BOSSLIST.map(name => name.toLowerCase());

async function populateMobs(){
    const files = ['a.json', 'b.json', 'c.json'];
    let allMobs = [];
    const fetchPromises = files.map(file => 
        fetch(`./mobs/${file}`)
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
    const naiveDmgPerHit = (lowestDmg + highestDmg)/2;
    const actualDmgPerHit = naiveDmgPerHit + naiveDmgPerHit * crit;
    console.log('Player Level:', playerLevel);
    console.log('Player HP:', playerHP);
    console.log('Armor:', armor);
    console.log('HP Regen:', hpRegen);
    console.log('Lowest Damage:', lowestDmg);
    console.log('Highest Damage:', highestDmg);
    console.log('Attack Speed:', attackSpd);
    console.log('Crit:', crit);
    console.log('Dodge:', dodge);

    let allMobs = await populateMobs();
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
        let hitsPerKill = Math.ceil(mob['health']/actualDmgPerHit); //basically, the hits needed is like my old ttk, but instead of DamagePerSecond I utilize the value of each hit.
        let mobTTK = Math.max((hitsPerKill - 1) * attackSpd, 1.5); //new mob TTK is dependant on the dmg speed of your hits. -1 because first attack is always free (autoattack reset);
        //Utilize math.max 0.2 because if mob dies instantly (0 TTK) it'd say infinite gold, which is simply untrue. Assuming you can loot and kill 5 things a second this is fine... probably unrealistic.
        let mobsPerHour = timingWindow/mobTTK; //unchanged? Might still need Math.Ceil to compensate for overkilling?;
        estimatedClicks = 3 * mobsPerHour; //2 clicks to attack each mob, 1 to loot it
        let rawGoldKillPerHour = ((mob['goldMin'] + mob['goldMax'])/2) * mobsPerHour;
        let goldFromDrops = 0;
        for (drop of mob['drops']){
            let dropRate = drop['dropRate']/100;
            let price = drop['item']['sellPrice'];
            let totalItemsPerHour = mobsPerHour * dropRate * drop['count']; //just add count, I mean, if it can drop 3 times... right?
            let totalItemValue = totalItemsPerHour * price;
            goldFromDrops += totalItemValue;
            estimatedClicks += 1 * dropRate * drop['count'];
        }
        let totalGoldPerHour = rawGoldKillPerHour + goldFromDrops;
        //console.log(`${mob['name']} TTK: ${mobTTK}. Total mobs killed per hour: ${timingWindow/mobTTK}. Gold per hour, no items: ${rawGoldKillPerHour}. Gold just from items: ${goldFromDrops}. Total Gold per Hour: ${totalGoldPerHour}`);
        //calculate mob dmg
        let mobDmgAvg = (mob['dmgMin'] + mob['dmgMax']) / 2;
        let mobDmgTaken = (mobDmgAvg * ((200 + playerLevel*50) / ((200 + playerLevel*50)+armor))) * (1-dodge); 
        let mobDmgPerKill = mobDmgTaken * (hitsPerKill - 1);
        let effectiveDmgTakenPerKill = mobDmgPerKill - hpRegen;
        let mobsUntilPlayerDies;
        if(effectiveDmgTakenPerKill <= 0){
            mobsUntilPlayerDies = "Can't die to this";
        }
        else{
            mobsUntilPlayerDies = playerHP/effectiveDmgTakenPerKill;
            mobsUntilPlayerDies = mobsUntilPlayerDies.toFixed(2);
        }

        //push all info to array
        mobAndGold.push({"name": mob['name'], "GPH": totalGoldPerHour.toFixed(2), "TTK": mobTTK.toFixed(2), "HPK": hitsPerKill, "MobDPK": mobDmgPerKill.toFixed(2), "Mobs until death": mobsUntilPlayerDies, "Clicks per Hour": estimatedClicks.toFixed(2)});
    }
    let sortedMobAndGold = mobAndGold.sort((a, b) => b.GPH - a.GPH);
    for (sortedItem of sortedMobAndGold){
        console.log(sortedItem);
    }
    const resultDiv = document.getElementById('response');
    resultDiv.innerHTML = '';
    const table = document.createElement('table');
    table.classList.add('mob-table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Name', 'Gold Per Hour', 'Time To Kill(sec)', 'Hits Per Kill', 'Mob Damage Per Kill', 'Mobs until Death', 'Clicks per Hour']
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

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultDiv.appendChild(table);
}