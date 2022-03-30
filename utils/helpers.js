import { clearWordSelection, highlightSentence, removeSentenceHighlights } from "./markText.js";

/*************************
 * Defaults:
 *************************/
// const DEFAULT_VOICE = 19; // for windows
const DEFAULT_VOICE = 0; // for mac
// sliders:
const pitch = document.querySelector("#pitch");
const pitchValue = document.querySelector(".pitch-value");
const rate = document.querySelector("#rate");
const rateValue = document.querySelector(".rate-value");

// buttons:
const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pause");
const resumeBtn = document.getElementById("resume");
const stopBtn = document.getElementById("stop");

// Checkboxes:
const checkboxes = document.querySelectorAll(
  "input[type=checkbox][name=settings]"
);
let enabledSettings = [];

const states = {
  START: "start",
  MIDDLE: "middle",
  // END: 'end'
};
let textarea = document.getElementById("textarea");

let sentenceCt = 0;
let startPosition = 0;
let endPositions = [];
let startPositions = [];
let state = states.START;

/***********************************************
 * RESETDEFAULTS: Perform Page Reset without Refresh
 ***********************************************/
const resetDefaults = () => {
  sentenceCt = 0;
  startPosition = 0;

  endPositions = [];
  startPositions = [];

  state = states.START;
  textarea = document.getElementById("textarea");
  // clearWordSelection(textarea);
};
/***********************************************/

const isNewSentence = (startIdx, endIdxArray, sentenceCt) => {
  if (
    state === states.START &&
    (sentenceCt === 0 ||
      (sentenceCt > 0 && startIdx > endIdxArray[sentenceCt - 1]))
  ) {
    console.log("****ISNEWSENTENCE");
    return true;
  }
  return false;
};

const isEndOfSentence = (endIdx, endIdxArray, sentenceCt) => {
  if (endIdxArray[sentenceCt - 1] === endIdx) {
    // console.log("****END OF SENTENCE")
    // console.log("sentenceCt:", sentenceCt, "; endIdxArray[sentenceCt - 1]:", endIdxArray[sentenceCt - 1], "; endIdx:", endIdx);
    return true;
  }
  return false;
};

const isEndOfParagraph = (
  currentIdx,
  endIdx,
  endIdxArray,
  sentenceCt,
  text
) => {
  
  if (
    sentenceCt > 2 &&
    endIdxArray[sentenceCt - 1] === endIdx &&
    sentenceCt === endIdxArray.length - 1
  ) {
    return true;
  }
  return false;
};

function getMatchIndices(regex, str) {
  let result = [];
  let match;
  regex = new RegExp(regex);
  while ((match = regex.exec(str)))
    // Add 1 for space offset
    result.push(match.index + 1);
  return result;
}
function newSentenceCheck(startingOffset, endingOffset, word, text) {
  // At First Sentence
  if (sentenceCt === 0) {
    console.log("TEXT:", text);
    // Find sentences ending in punctuation and space
    let regex = /([.!?])+\s/g;
    endPositions = getMatchIndices(regex, text);

    // Get last sentence end position, which contains no space
    // const lastSentenceEndIndex = text.length-1;
    //Push index on endPositions array
    endPositions.push(text.length);
    console.log("END_SENTENCE_POSITIONS:", endPositions);
  }

  // At start of New Sentence
  if (isNewSentence(startingOffset, endPositions, sentenceCt)) {
    sentenceCt += 1;
    // isNewSentence = false;
    startPosition = startingOffset;
    startPositions.push(startPosition);

    /************************
     * Highlight the first Sentence:
     ************************/
    console.log(
      `StartIndex: ${startPositions[sentenceCt - 1]}; endPositions: ${
        endPositions[sentenceCt - 1]
      }}`
    );

    highlightSentence(
      startPositions[sentenceCt - 1],
      endPositions[sentenceCt - 1]
    );

    console.log("SENTENCE_COUNT:", sentenceCt);
    state = states.MIDDLE;
    /***********************/
  } // first sentence

  console.log(
    `Count: ${sentenceCt}; endPosition: ${
      endPositions[sentenceCt - 1]
    }; endingOffset: ${endingOffset}`
  );
  console.log(
    `SentenceEndIndex: ${
      endPositions[sentenceCt - 1]
    }; EndingOffset: ${endingOffset}`
  );

  if (isEndOfSentence(endingOffset, endPositions, sentenceCt)) {
    console.log("SENTENCE_COUNT:", sentenceCt);
    state = states.START;
    startPosition = 0;
  }

  if (
    isEndOfParagraph(
      startingOffset,
      endingOffset,
      endPositions,
      sentenceCt,
      text
    )
  ) {
    return true;
  }
  return false;
}
/*********************/
const setVoiceOptions = (voices, voiceSelect, utterThis) => {
  let selectedOption = voiceSelect.selectedOptions[0].getAttribute("data-name");

  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name === selectedOption) {
      utterThis.voice = voices[i];
      break;
    }
  } // for
  utterThis.rate = rate.value;
  utterThis.pitch = pitch.value;
}; // setVoiceOptions

export const setSpeech = () => {
  return new Promise(function (resolve, reject) {
    let synth = window.speechSynthesis;
    let id;

    id = setInterval(() => {
      if (synth) {
        resolve(synth);
        clearInterval(id);
      }
    }, 20);
  });
};

const speak = (synth, utterThis) => {
  if (synth.speaking) {
    console.error("speechSynthesis.speaking");
    return;
  }

  // Start Speaking
  synth.speak(utterThis);

  // End is fired when utterance is finished being spoken
  utterThis.onend = function (event) {
    console.log("SpeechSynthesisUtterance.onend", event);
    resetDefaults();
  };
  // Error Event is fired when an err occurs that prevents the utterance from being spoken
  utterThis.onerror = function (event) {
    console.error("SpeechSynthesisUtterance.onerror");
  };
}; // speak

async function onboundaryHandler(event, type) {
  // Get the entire text
  let value = textarea.value;

  // Get index of the first char that triggered the
  // utterance event
  let index = event.charIndex;

  // Get the entire word
  let word = getWordAt(value, index);
  let anchorPosition = getWordStart(value, index);
  let activePosition = anchorPosition + word.length;

  /*********************
   * Word selection complete
   **********************/
  if(activePosition === value.length-1) {
  console.log("@@@@currentPosition:", activePosition, "; lastPosition:", value.length);
  clearWordSelection(textarea);
  resetDefaults();
}
  if (type === "sentence") {
    // If new Sentence then set anchorPosition
    let isEndOfParagraph = newSentenceCheck(
      anchorPosition,
      activePosition,
      word,
      value
    );
    console.log("&&&&&&&EndofPage:", isEndOfParagraph);
    if (isEndOfParagraph) {
      /**********************
       * Remove Selection: 
       * Must be applied to word 
       * condition as well
       ***********************/
       removeSentenceHighlights();
        resetDefaults();
      /***********************/
    }
  }

  textarea.focus();
  // if there is no current selected range
  if (textarea.setSelectionRange) {
    textarea.setSelectionRange(anchorPosition, activePosition);
  } else {
    // OLD CONTENT
    // console.log("########NO SETSELECTION RANGE")
    // let range = textarea.createTextRange();
    // range.collapse(true);
    // range.moveEnd("character", activePosition);
    // range.moveStart("character", anchorPosition);
    // range.select();
  }
} //onBoundary

// Get the word of a string given the string and index
function getWordAt(str, pos) {
  // Perform type conversions.
  str = String(str);
  pos = Number(pos) >>> 0;

  /***********************************************
   * match on a non-whitespace letter
   * Search for the word's beginning index. loop
   * through the starting index of each word
   * and return the index of all non-whitespace char
   ***********************************************/
  let left = str.slice(0, pos + 1).search(/\S+$/);
  /***********************************************
   * match on a whitespace letter
   * Search for the word's ending index. loop
   * through the index of each word
   * and return the index of whitespace char
   * as end index
   ***********************************************/
  let right = str.slice(pos).search(/\s/);

  // The last word in the string is a special case.
  if (right < 0) {
    return str.slice(left);
  }

  /**********************************************
   * Return the word, using the located bounds to
   * extract it from the string.
   **********************************************/
  let word = str.slice(left, right + pos);
  console.log("WORD:", word);
  return word;
}

// Get the position of the beginning of the word
function getWordStart(str, pos) {
  str = String(str);
  pos = Number(pos) >>> 0;

  /***********************************************
   * From the whole text str, slice the first
   * letter and increment by one, search loops
   * thru text, until a non-whitespace character
   * is found, and returns the char index of the
   * start of the word,
   ************************************************/
  let start = str.slice(0, pos + 1).search(/\S+$/);
  // console.log("Start:", start);
  return start;
}

export const activateListeners = (
  synth,
  voices,
  voiceSelect,
  utterThis,
  inputTxt
) => {
  /*
For IE11 support, replace arrow functions with normal functions and
use a polyfill for Array.forEach:
https://vanillajstoolkit.com/polyfills/arrayforeach/
*/

  // Use Array.forEach to add an event listener to each checkbox.
  checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      enabledSettings = Array.from(checkboxes) // Convert checkboxes to an array to use filter and map.
        .filter((i) => i.checked) // Use Array.filter to remove unchecked checkboxes.
        .map((i) => i.value); // Use Array.map to extract only the checkbox values from the array of objects.
    });
  });

  playBtn.onclick = (event) => {
    event.preventDefault();

    resetDefaults();
    setVoiceOptions(voices, voiceSelect, utterThis);
    utterThis.text = inputTxt.value;

    switch (true) {
      case enabledSettings.includes("sentence"):
        // console.log("In sentence case");
        /**********************************
         * Fired when the spoken utterance reaches
         * a word or sentence boundary
         * ********************************/
        utterThis.onboundary = (event) => onboundaryHandler(event, "sentence");
        synth.speak(utterThis);
        break;
      case enabledSettings.includes("line"):
        utterThis.onboundary = (event) => onboundaryHandler(event, "line");
        break;
      case enabledSettings.includes("word"):
        utterThis.onboundary = (event) => onboundaryHandler(event, "word");
        synth.speak(utterThis);
        break;
      default:
    }
  };

  pauseBtn.onclick = (event) => {
    event.preventDefault();
    if (speechSynthesis) {
      speechSynthesis.pause();
    }
  };

  resumeBtn.onclick = (event) => {
    event.preventDefault();
    if (speechSynthesis) {
      speak(synth, utterThis);
      speechSynthesis.resume();
    }
  };

  stopBtn.onclick = (event) => {
    event.preventDefault();
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    resetDefaults();
  };

  pitch.onchange = function () {
    utterThis.pitch = pitch.value;
    pitchValue.textContent = pitch.value;
  };

  rate.onchange = function () {
    utterThis.rate = rate.value;
    rateValue.textContent = rate.value;
  };

  voiceSelect.onchange = function (event) {
    // NOTE: setInitial voice, must recall, when new voice selected.
    setVoiceOptions(voices, voiceSelect, utterThis);

    speak(synth, utterThis);
  };
};

//populate options and set selected to first option
export const populateVoiceList = async (
  synth,
  voices,
  voiceSelect,
  utterThis
) => {
  voices = await synth.getVoices().sort(function (a, b) {
    const aname = a.name.toUpperCase(),
      bname = b.name.toUpperCase();
    if (aname < bname) return -1;
    else if (aname == bname) return 0;
    else return +1;
  });

  let selectedIndex =
    voiceSelect.selectedIndex < 0 ? DEFAULT_VOICE : voiceSelect.selectedIndex;
  voiceSelect.innerHTML = "";
  for (let i = 0; i < voices.length; i++) {
    let option = document.createElement("option");
    option.textContent = voices[i].name + " (" + voices[i].lang + ")";

    if (voices[i].default) {
      option.textContent += " -- DEFAULT";
    }

    option.setAttribute("data-lang", voices[i].lang);
    option.setAttribute("data-name", voices[i].name);
    voiceSelect.appendChild(option);
  } // for

  // voiceSelect is default index 0
  voiceSelect.selectedIndex = selectedIndex;

  // NOTE: setInitial voice, must recall, when new voice selected.
  setVoiceOptions(voices, voiceSelect, utterThis);
  return voices;
}; // populate voice list
