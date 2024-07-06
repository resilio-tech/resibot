module.exports = {
    "root": true,
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {"project": ["./tsconfig.json"]},
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "@typescript-eslint/strict-boolean-expressions": [
            2,
            {
                "allowString": false,
                "allowNumber": false
            }
        ]
    },
    "ignorePatterns": ["configs/*", "src/**/*.test.ts", "src/frontend/generated/*"]
}