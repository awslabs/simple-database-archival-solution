module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier', // Add this
		'plugin:prettier/recommended', // And this
	],
	overrides: [],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: ['react', '@typescript-eslint', 'prettier'], // Add 'prettier' here
	rules: {
		'react/prop-types': 'off',
		'react/jsx-uses-react': 'off',
		'react/react-in-jsx-scope': 'off',
		'no-mixed-spaces-and-tabs': 0,
		'no-var': 0,
		'prettier/prettier': [
			'error',
			{
				useTabs: true,
				tabWidth: 4,
				singleQuote: true,
				trailingComma: 'es5',
				printWidth: 80,
				semi: true,
			},
		],
	},
	ignorePatterns: ['node_modules/', 'dist/', 'build/'],
};
