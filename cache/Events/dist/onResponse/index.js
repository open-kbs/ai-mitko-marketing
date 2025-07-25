/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __nccwpck_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__nccwpck_require__.r(__webpack_exports__);

// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  "handler": () => (/* binding */ handler)
});

;// CONCATENATED MODULE: ./actions.js
// Create embeddings for the interview content
const embeddingModel = "text-embedding-3-large";
const embeddingDimension = 1536;

const getActions = (meta) => [
    [/<textToImage>([\s\S]*?)<\/textToImage>/s, async (match) => {
        const description = match[1].trim();
        const image = await openkbs.generateImage(description, {
            n: 1,
            size: "1024x1024",
            quality: "high"
        });
        const imageSrc = `data:image/png;base64,${image[0].b64_json}`;
        return { type: 'SAVED_CHAT_IMAGE', imageSrc, ...meta };
    }],
    [/<webpageToText>([\s\S]*?)<\/webpageToText>/s, async (match) => {
        try {
            let response = await openkbs.webpageToText(match[1], { parsePrice: true });
            if (response?.content?.length > 5000) response.content = response.content.substring(0, 5000);
            return { data: response, ...meta };
        } catch (e) {
            return { error: e.response.data, ...meta };
        }
    }],
    [/<googleSearch>([\s\S]*?)<\/googleSearch>/s, async (match) => {
        const q = match[1].trim();

        try {
            const response = await openkbs.googleSearch(q);

            const data = response?.map(({ title, link, snippet, pagemap }) => ({
                title,
                link,
                snippet,
                image: pagemap?.metatags?.[0]?.["og:image"]
            }));

            return { data, ...meta };

        } catch (e) {
            return { error: e.response?.data || e.message, ...meta };
        }
    }],
    [/<deleteMemoryRecord>([\s\S]*?)<\/deleteMemoryRecord>/s, async (match) => {
        const itemId = match[1].trim();
        try {
            const response = await openkbs.items({
                action: 'deleteItem',
                itemType: 'memoryRecord',
                itemId: itemId
            });
            return { type: 'MEMORY_RECORD_DELETED', data: { itemId }, ...meta };
        } catch (e) {
            return { error: e.response?.data || e.message, ...meta };
        }
    }],
    [/<createMemoryRecord>([\s\S]*?)<\/createMemoryRecord>/s, async (match) => {
        const fullContent = match[1].trim();
        const lines = fullContent.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        try {
            // Create embeddings for the memory record
            const embeddingText = `${title}\n\n${content}`;
            const { embeddings, totalTokens } = await openkbs.createEmbeddings(embeddingText, embeddingModel);
            
            const response = await openkbs.items({
                action: 'createItem',
                itemType: 'memoryRecord',
                attributes: [
                    { attrType: "keyword1", attrName: "title", encrypted: true },
                    { attrType: "text1", attrName: "content", encrypted: true }
                ],
                item: { title: await openkbs.encrypt(title) , content: await openkbs.encrypt(content) },
                totalTokens,
                embeddings: embeddings ? embeddings.slice(0, embeddingDimension) : undefined,
                embeddingModel,
                embeddingDimension
            });
            return { type: 'MEMORY_RECORD_CREATED', data: response, ...meta };
        } catch (e) {
            return { error: e.response?.data || e.message, ...meta };
        }
    }],
    [/<saveIntroductoryInterview>([\s\S]*?)<\/saveIntroductoryInterview>/s, async (match) => {
        const content = match[1].trim();
        try {
            const { embeddings, totalTokens } = await openkbs.createEmbeddings(content, embeddingModel);
            
            const response = await openkbs.items({
                action: 'createItem',
                itemType: 'interview',
                attributes: [
                    { attrType: "itemId", attrName: "itemId", encrypted: false },
                    { attrType: "text1", attrName: "content", encrypted: true }
                ],
                item: { itemId: 'interview', content: await openkbs.encrypt(content)},
                totalTokens,
                embeddings: embeddings ? embeddings.slice(0, embeddingDimension) : undefined,
                embeddingModel,
                embeddingDimension
            });
            return { type: 'INTERVIEW_SAVED', data: response, ...meta };
        } catch (e) {
            return { error: e.response?.data || e.message, ...meta };
        }
    }],
    [/<googleImageSearch(?:\s+limit="(\d+)")?>([\s\S]*?)<\/googleImageSearch>/s, async (match) => {
        const fullContent = match[2] || match[1];
        const q = fullContent.trim();
        const limit = match[1] ? parseInt(match[1]) : 10;

        try {
            const response = await openkbs.googleSearch(q, { searchType: 'image' });

            const data = response?.map(({ title, link, snippet, pagemap }) => {
                const imageObj = pagemap?.cse_image?.[0];
                const thumbnail = imageObj?.src || pagemap?.metatags?.[0]?.["og:image"] || link;
                return {
                    title,
                    link,
                    snippet,
                    image: thumbnail
                };
            })?.slice(0, limit);

            return { data, ...meta };

        } catch (e) {
            return { error: e.response?.data || e.message, ...meta };
        }
    }],
    [/<sendMail>([\s\S]*?)<\/sendMail>/s, async (match) => {
        const fullContent = match[1].trim();
        const lines = fullContent.split('\n');
        const email = lines[0].trim();
        const subject = lines[1].trim();
        const content = lines.slice(2).join('\n').trim();
        try {
            const response = await openkbs.sendMail(email, subject, content);
            return { type: 'EMAIL_SENT', data: { email, subject, response }, ...meta };
        } catch (e) {
            return { error: e.response?.data || e.message, ...meta };
        }
    }]
];
;// CONCATENATED MODULE: ./onResponse.js


const handler = async (event) => {
    const actions = getActions({_meta_actions: ["REQUEST_CHAT_MODEL"]});

    for (let [regex, action] of actions) {
        const lastMessage = event.payload.messages[event.payload.messages.length - 1].content;        
        const match = lastMessage?.match(regex);        
        if (match) return await action(match);            
    }

    return { type: 'CONTINUE' }
};
module.exports = __webpack_exports__;
/******/ })()
;