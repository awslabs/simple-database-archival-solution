/**
 * Copyright 2025 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';

// The translations
const resources = {
	en: {
		translation: translationEN,
	},
	pt: {
		translation: translationPT,
	},
};

i18n
	// Detect user language
	.use(LanguageDetector)
	// Pass the i18n instance to react-i18next
	.use(initReactI18next)
	// Initialize i18next
	.init({
		resources,
		fallbackLng: 'en', // Default language
		lng: 'en', // Initial language
		debug: false, // Set to true for debugging

		interpolation: {
			escapeValue: false, // React already escapes values
		},

		// Language detection options
		detection: {
			// Order of language detection
			order: ['localStorage', 'navigator'],
			// Keys to lookup language from
			lookupLocalStorage: 'i18nextLng',
			// Cache user language
			caches: ['localStorage'],
		},
	});

export default i18n;
