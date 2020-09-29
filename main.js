// This is going to a be a simple client for generating, storing, retrieving keys, etc.
// Closure

var crypto = require("crypto"); // Swiss army knife for all things encryption, hashing and security.
var fs = require("fs");
var inquirer = require("inquirer"); // Great module for collecting user input.
var rwords = require("random-words"); // Random words for file / key naming

require("./debug.js");
var debug = new Debugger(); // A little debugging module for timing and colored text.

config = async () => {
  return data = await inquirer.prompt([
    {
      type: 'list',
      message: 'What do you need, doctor?',
      choices: [
        'Generate new public-private key pair',
        'View existing public-private key pair(s)',
        'Setup / settings',
        new inquirer.Separator(),
        'Nuke all keys'
      ],
      filter: function (val) {
        return val.toLowerCase();
      },
      name: 'configChoice'
    }
  ]);
};

console.log(crypto.randomBytes(16).toString('hex'));


//---------------------------------------------------------------------------------------------------------------------------//

async function ls(path) {
  const dir = await fs.promises.opendir(path)
  var fInFolder = [];
  for await (const dirent of dir) {
    fInFolder.push(dirent.name);
  }
  return fInFolder;
}

function customPadding(str, blockSize, padder, format) {
  str = new Buffer(str,"utf8").toString(format);
  //1 char = 8bytes
  var bitLength = str.length*8;

  if(bitLength < blockSize) {
    for(i=bitLength;i<blockSize;i+=8) {
      str += padder;
    }
  } else if(bitLength > blockSize) {
    while((str.length*8)%blockSize != 0) {
      str+= padder;
    }
  }
  return new Buffer(str, format).toString("utf8");
}

//---------------------------------------------------------------------------------------------------------------------------//

ePKey = async (settings, privateKey) => {
  var passphraseInquire = await inquirer.prompt([
    {
      type: 'input',
      message: `Enter passphrase to encrypt private key file with (Chosen algorithm: ${settings.keyFileSettings.keyFileEncryption.algorithm}): \n`,
      name: 'passphrase'
    }
  ]);
  let cPass = passphraseInquire.passphrase;
  let isNumOnly = /^\d+$/.test(cPass);
  let hasUpperCase = (cPass.toLowerCase() !== cPass);
  let hasLowerCase = (cPass.toUpperCase() !== cPass);
  let length = cPass.length;

  if (isNumOnly) {
    debug.warn(`Password only contains numbers, this makes it much easier to bruteforce`);
  }
  if (!hasUpperCase) {
    debug.warn(`No uppercase letters detected, this makes it much easier to bruteforce if using alphabetical characters`);
  }
  if (!hasLowerCase) {
    debug.warn(`No lowercase letters detected, this makes it much easier to bruteforce if using alphabetical characters`);
  }
  if (length < 16) {
    debug.warn(`Password length is below 16 characters, this makes it quite insecure and easier to bruteforce\n`);
  }
  const iv = crypto.randomBytes(16).toString('hex').slice(0, 16);
  const key = crypto.createHash('sha256').update(String(cPass)).digest('base64').substr(0, 32);
  const cipher = crypto.createCipheriv(settings.keyFileSettings.keyFileEncryption.algorithm, key, iv).setAutoPadding(true); // just testin atm
  const encrypted = cipher.update(String(privateKey), 'utf8', 'base64')/* + cipher.final('base64')*/;
  return (encrypted);
};

saveKeys = async (toEncrypt, publicKey, privateKey) => {
  var processedPKey = privateKey;
  var settings = await require('./settings.json');
  if (toEncrypt == true) processedPKey = await ePKey(settings, privateKey);
  let naming = rwords(2).join("-");
  var pkeyNaming = `./keys/${naming}.private`;
  if (processedPKey != privateKey) {
    pkeyNaming = `./keys/${naming}.private.aes`;
  }
  var savePublic = await inquirer.prompt([
    {
      type: 'list',
      message: 'Save public key?',
      choices: [
        'Yes',
        'No',
      ],
      name: 'configChoice2'
    }
  ]);
  switch (savePublic.configChoice2) {
    case "Yes": {
      fs.writeFileSync(`./keys/${naming}.public`, publicKey.toString()); debug.success("Wrote public key");
    }
    case "No": {
      fs.writeFileSync(pkeyNaming, processedPKey.toString()); debug.success("Wrote private key");
      break;
    }
  }
}

//---------------------------------------------------------------------------------------------------------------------------//


generateKeys = async () => {
  var settings = await require('./settings.json');
  var { generateKeyPairSync } = crypto;
  debug.startTime();
  try {
    const { publicKey, privateKey } = generateKeyPairSync(settings.keySettings.keyType, {
      modulusLength: settings.keySettings.length,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    debug.success(`Generated key pair, time it took: ${debug.endTime().toFixed(2)}ms`);
    var afterGeneration = await inquirer.prompt([
      {
        type: 'list',
        message: `What should I do with the keys?`,
        choices: [
          `Display keys and do nothing else`,
          `Save keys to files, encrypt private key using ${settings.keyFileSettings.keyFileEncryption.algorithm}`,
          `Save keys to files, do NOT encrypt private key`
        ],
        filter: function (val) {
          return val.toLowerCase();
        },
        name: 'data'
      }
    ]);
    switch (afterGeneration.data) {
      case `display keys and do nothing else`: debug.success(publicKey, privateKey); break;
      case `save keys to files, encrypt private key using ${settings.keyFileSettings.keyFileEncryption.algorithm}`: saveKeys(true, publicKey, privateKey); break;
      case `save keys to files, do not encrypt private key`: saveKeys(false, publicKey, privateKey); break;
    }
  } catch (err) {
    debug.error("Failed to generate key pair", err);
  }
};

viewKeys = async () => {
  var settings = await require("./settings.json");
  var allKeys = await ls(`./keys/`);
  var afterLs = await inquirer.prompt([
    {
      type: 'list',
      message: `Which key do ya want?`,
      choices: allKeys,
      name: 'whichKey'
    }
  ]);
  if (allKeys.includes(afterLs.whichKey)) {
    let splitS = afterLs.whichKey.split(/[.]/); // wow regex
    if (splitS.includes('aes')) {
      var decryptOrNot = await inquirer.prompt([
        {
          type: 'list',
          message: `Requested key file appears to be encrypted, want to try to decrypt it, doc?`,
          choices: [
            `Yes`,
            `No`,
            `Just show me the encrypted key`
          ],
          filter: function (val) {
            return val.toLowerCase();
          },
          name: 'decryptOrNot'
        }
      ]);
      switch (decryptOrNot.decryptOrNot) {
        case 'yes': {
          var decryptionOptions = await inquirer.prompt([
            {
              type: 'input',
              message: `What algorithm should I use?`,
              filter: function (val) {
                return val.toLowerCase();
              },
              default: 'aes-256-cbc',
              name: 'algorithmToDecryptWith'
            },
            {
              type: 'password',
              message: `Alright, give me a password that I can work with`,
              filter: function (val) {
                return val.toLowerCase();
              },
              name: 'passToDecryptWith'
            }
          ]);
          fs.readFile(`./keys/${afterLs.whichKey}`, 'utf8', function read(err, data) {
            if (err) {
              debug.error('Something happened while attempting to read the key file', err);
            }
            const iv = crypto.randomBytes(16).toString('hex').slice(0, 16);
            const key = crypto.createHash('sha256').update(String(decryptionOptions.passToDecryptWith)).digest('base64').substr(0, 32);
            const decipher = crypto.createDecipheriv(decryptionOptions.algorithmToDecryptWith, key, iv).setAutoPadding(true);
            debug.success(decipher.update(data, 'base64', 'utf8'));
          });
        }
        case 'no': {
          console.clear(); viewKeys();
        }
        case 'just show me the encrypted key': {
          fs.readFile(`./keys/${afterLs.whichKey}`, 'utf8', function read(err, data) {
            if (err) {
              debug.error('Something happened while attempting to read the key file', err);
            }
            console.log(data);
          });
        }
      }
    } else {
      fs.readFile(`./keys/${afterLs.whichKey}`, 'utf8', function read(err, data) {
        if (err) {
          debug.error('Something happened while attempting to read the key file', err);
        }
        console.log(data);
      });
    }
  };
};

nukeKeys = async () => {

};

settings = async () => {

};

(main = async () => {
  let retry;
  do {
    let data = await config();
    retry = false;
    switch (data.configChoice) {
      case 'generate new public-private key pair': console.clear(); generateKeys(); break;
      case 'view existing public-private key pair(s)': console.clear(); viewKeys(); break;
      case 'setup / settings': console.clear(); nukeKeys(); break;
      case 'nuke all keys': console.clear(); settings(); break;
      default: console.clear(); console.log("Invalid input"); retry = true; break;
    }
  } while (retry);
})();
