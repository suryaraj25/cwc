const mongoose = require('mongoose');
const WhitelistedEmail = require('./models/WhitelistedEmail');
require('dotenv').config();

const emails = [
    "mohanakrishna.ct23@bitsathy.ac.in",
    "aniruth.ct@bitsathy.ac.in",
    "ahillpranav.ct23@bitsathy.ac.in",
    "naresh.ct23@bitsathy.ac.in",
    "sudhir.ct23@bitsathy.ac.in",
    "hariharasudhan.cb23@bitsathy.ac.in",
    "rahul.cs23@bitsathy.ac.in",
    "suryaraj.al23@bitsathy.ac.in",
    "mithunram.al23@bitsathy.ac.in",
    "kowshika.al23@bitsathy.ac.in",
    "himashree.al23@bitsathy.ac.in",
    "lathika.al23@bitsathy.ac.in",
    "swethagayathri.al23@bitsathy.ac.in",
    "mathivathani.al23@bitsathy.ac.in",
    "priyadharsinik.al23@bitsathy.ac.in",
    "sudharshan.al23@bitsathy.ac.in",
    "gyanahprakash.al23@bitsathy.ac.in",
    "preethika.se23@bitsathy.ac.in",
    "pooja.se23@bitsathy.ac.in",
    "ilamadhic.cs24@bitsathy.ac.in",
    "abishekr.cs24@bitsathy.ac.in",
    "hemavarshanar.cs24@bitsathy.ac.in",
    "bandarubhavanasri.al24@bitsathy.ac.in",
    "ganapathynathankumar.cs24@bitsathy.ac.in",
    "lakshanyaaj.cb24@bitsathy.ac.in",
    "subavarthinis.cs25@bitsathy.ac.in",
    "monishak.al25@bitsathy.ac.in",
    "aparnas.it25@bitsathy.ac.in",
    "girijaak.it25@bitsathy.ac.in",
    "praveenmanojn.al25@bitsathy.ac.in",
    "senthilav.al25@bitsathy.ac.in",
    "chinthanac.ad25@bitsathy.ac.in",
    "jeganudhayas.bt25@bitsathy.ac.in",
    "arjuns.ad25@bitsathy.ac.in",
    "elakkeyaa.it25@bitsathy.ac.in",
    "akashyak.ad25@bitsathy.ac.in",
    "srisatishb.ad25@bitsathy.ac.in",
    "muhamedlukmaanhakimm.cs25@bitsathy.ac.in",
    "dhanusris.ec@bitsathy.ac.in",
    "ponsaravanagururp.ad25@bitsathy.ac.in",
    "harieshragavendrant.ad25@bitsathy.ac.in",
    "varshinim.cs25@bitsathy.ac.in",
    "poovithas.cs25@bitsathy.ac.in",
    "nanthinii.it25@bitsathy.ac.in",
    "bavanajk.it25@bitsathy.ac.in",
    "jeevithan.al25@bitsathy.ac.in",
    "praneshm.ad25@bitsathy.ac.in",
    "logaranarayanans.al25@bitsthy.ac.in",
    "swethag.cs25@bitsathy.ac.in",
    "pradeepp.ec25@bitsathy.ac.in",
    "shabeeln.it25@bitsathy.ac.in",
    "jayasric.it25@bitsarhy.ac.in",
    "kalaisudart.ad25@bitsathy.ac.in",
    "yaswanthkalisp.ad25@bitsathy.ac.in",
    "ajaykrishnap.cs25@bitsathy.ac.in",
    "gowsikam.ec25@bitsathy.ac.in",
    "nithilans.ad25@bitsathy.ac.in",
    "yashwantht.it25@bitsathy.ac.in",
    "sridhanyar.al25@bitsathy.ac.in",
    "jashmithar.cs25@bitsathy.ac.in",
    "megarasis.al25@bitsathy.ac.in",
    "deepasrees.it25@bitsathy.ac.in",
    "haripriyac.it25@bitsathy.ac.in",
    "abineshk.ad25@bitsathy.ac.in",
    "gowthamany.al25@bitsathy.ac.in",
    "janavarshinia.al25@bitsathy.ac.in",
    "kamaleshp.ad25@bitsathy.ac.in",
    "matheshkumar.it25@bitsathy.ac.in",
    "kanishkamc.cs25@bitsathy.ac.in",
    "sonalits.ad25@bitsathy.ac.in",
    "bharanit.ad25@bitsathy.ac.in",
    "lokeshr.it25@bitsathy.ac.in",
    "ganiksharavikumardhanalakshmi.ec25@bitsathy.ac.in",
    "anushkumar.ad25@bitsathy.ac.in",
    "mohamedirfanr.ad25@bitsathy.ac.in",
    "vinithirhak.cs25@bitsathy.ac.in",
    "myshrirs.cs25@bitsathy.ac.in",
    "lakshanaan.al25@bitsathy.ac.in",
    "jayashreej.it25@bitsathy.ac.in",
    "sheerinbanun.al25@bitsathy.ac.in",
    "darshanprabakaransangeetha.it25@bitsathy.ac.in",
    "devanisantha.al25@bitsathy.ac.in",
    "shamyuthas.al25@bitsathy.ac.in",
    "praneshs.ad25@bitdathy.ac.in",
    "idhayaja.it25@bitsathy.ac.in",
    "lavanyah.cs25@bitsathy.ac.in",
    "dharshiniyadav.ad25@bitsathy.ac.in",
    "yuvarajn.ad25@bitsathy.ac.in",
    "praveena.cs25@bitsathy.ac.in",
    "harshak.ec25@bitsathy.ac.in",
    "balavishwas.ad25@bitsathy.ac.in",
    "Pragathishp.it25@bitsathy.ac.in",
    "gayathrideviv.al25@bitsathy.ac.in",
    "kabilanka.cs24@bitsathy.ac.in",
    "pragathip.mz24@bitsathy.ac.in",
    "jayadevkr.cs24@bitsathy.ac.in",
    "swathim.al24@bitsathy.ac.in",
    "sreevk.al24@bitsathy.ac.in",
    "manjuryam.cs24@bitsathy.ac.in",
    "sangitkb.cs24@bitsathy.ac.in",
    "ajaiselvaraj.cb24@bitsathy.ac.in",
    "gowthamk.ec24@bitsathy.ac.in",
    "kanishk.cs24@bitsathy.ac.in",
    "vaishalis.it24@bitsathy.ac.in",
    "labagarans.ec24@bitsathy.ac.in",
    "iniyar.ad24@bitsathy.ac.in",
    "megaranjinis.it24@bitsathy.ac.in",
    "anikshan.ad24@bitsathy.ac.in",
    "gayathrius.ad24@bitsathy.ac.in",
    "swathis.cs24@bitsathy.ac.in",
    "jananisubhas.cs24@bitsathy.ac.in",
    "karthikrajas.ad24@bitsathy.ac.in",
    "vibakars.ad24@bitsathy.ac.in",
    "harinems.cs24@bitsathy.ac.in",
    "pranavis.ad24@bitsathy.ac.in",
    "uthayakumarm.ad24@bitsathy.ac.in",
    "baladevkrishnank.cs24@bitsathy.ac.in"
];

const seedEmails = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clean duplicates within the list and whitespace
        const cleanEmails = [...new Set(emails.map(e => e.trim().toLowerCase()))];

        console.log(`Processing ${cleanEmails.length} unique emails...`);

        let addedCount = 0;
        let skippedCount = 0;

        for (const email of cleanEmails) {
            try {
                // Check if exists
                const existing = await WhitelistedEmail.findOne({ email });
                if (!existing) {
                    await WhitelistedEmail.create({ email });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            } catch (err) {
                console.error(`Error adding ${email}:`, err.message);
            }
        }

        console.log(`Finished seeding.`);
        console.log(`Added: ${addedCount}`);
        console.log(`Skipped (Already Exists): ${skippedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedEmails();
