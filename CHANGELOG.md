# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.5.0 (2025-12-22)

### Features

- **Database Views**: Create and manage custom views for complex queries
  - Create views with custom SQL definitions
  - List all views in a database
  - Delete views through the UI
  - Access views like regular tables in SQL queries
  - Simplify complex JOIN operations with reusable view logic

- **Full Data Access**: Query entire datasets without row limitations
  - New `/api/archive/query-full` endpoint for unlimited result sets
  - Execute custom SQL queries across multiple tables
  - Multi-table JOINs and complex queries supported
  - Enhanced table name transformation for seamless querying

- **Query Results Download**: Export query results as CSV files
  - New `/api/archive/download` endpoint
  - Download Athena query results directly from S3
  - Support for large result sets

- **Bilingual Support**: Complete interface translation (English/Portuguese)
  - Language selector in navigation bar
  - Persistent language preference stored in localStorage
  - All UI components, labels, and messages translated
  - Support for both English and Portuguese (Português)

### API Enhancements

- **Enhanced Query API** (`/api/archive/query`):
  - Added table name transformation to convert user-friendly names to Glue catalog names
  - Integrated DynamoDB access to fetch archive metadata
  - Added Glue catalog integration to fetch and preserve view names
  - Views are not transformed, allowing direct access by name

- **New API Endpoints**:
  - `/api/archive/query-full` - Execute queries without row limitations
  - `/api/archive/download` - Download query results as CSV
  - `/api/archive/views/list` - List all views in a database
  - `/api/archive/views/delete` - Delete a view

### Dependency Updates

- **Web App**:
  - Added `i18next` ^23.11.5 for internationalization
  - Added `i18next-browser-languagedetector` ^7.2.1 for language detection
  - Added `react-i18next` ^14.1.2 for React integration

### Infrastructure Changes

- **Lambda Permissions**:
  - Added DynamoDB read permissions to query API lambda
  - Enhanced Glue catalog permissions for view management
  - Added S3 read permissions for query result downloads

### Documentation

- Updated README.md with new features:
  - Database Views section with use cases
  - Full Data Access capabilities
  - Language support documentation
  - Enhanced data access section

### Bug Fixes

- Fixed table name resolution in SQL queries to support Glue catalog naming
- Improved error handling in query execution
- Enhanced view detection to prevent transformation of view names

## 1.1.2 (2025-11-10)

### Bug Fixes

-   Update package dependencies, fix vulnerability & fix deployment bugs for SDAS ([53d9fd9](https://github.com/awslabs/simple-database-archival-solution/commit/53d9fd98a836d21eedfd38719103b0297a0fb96a))

### Dependency Updates

-   **CDK**: Updated aws-cdk from 2.173.1 to ^2.1031.1
-   **CDK**: Updated aws-cdk-lib from 2.173.1 to ^2.222.0
-   **Web App**: Updated react-scripts from 5.0.0 to ^5.0.1
-   **Security**: Added security patches for nth-check ^2.1.1, postcss ^8.4.31, webpack-dev-server ^4.15.1, svgo ^3.0.0
-   **Cleanup**: Removed unused dependencies: @aws-cdk/aws-athena, git-branch, git-repo-name, @types/git-branch, @types/git-repo-name

## 1.1.0 (2023-04-12)

-   Added support for PostgreSQL

### Features

-   Added Microsoft SQL data types that where not supported ([9685e35](https://github.com/awslabs/simple-database-archival-solution/commit/9685e354d1f1f42274e66e2467d4e7324e31b156))

-   Update LICENSE ([3f3d0f6](https://github.com/awslabs/simple-database-archival-solution/commit/30fbd0a18a60c84777c83ec8505dc095aeec1faa))

## 1.0.2 (2023-04-12)

### Bug Fixes

-   Added Microsoft SQL data types that where not supported ([9685e35](https://github.com/awslabs/simple-database-archival-solution/commit/9685e354d1f1f42274e66e2467d4e7324e31b156))

-   Update LICENSE ([3f3d0f6](https://github.com/awslabs/simple-database-archival-solution/commit/30fbd0a18a60c84777c83ec8505dc095aeec1faa))

## 1.0.1 (2023-04-07)

### Bug Fixes

-   Added Microsoft SQL data types that where not supported ([9a4328f](https://github.com/awslabs/simple-database-archival-solution/commit/9a4328f8ef32040681447eb36e20d3bc0b5fc026)) & ([57df514](https://github.com/awslabs/simple-database-archival-solution/commit/57df5143353561ffbf7ba0c0c565d0bba2679928))

-   Update CDK memory size for StepFunctionGlueStepSix ([dd65fca](https://github.com/awslabs/simple-database-archival-solution/commit/dd65fca28d8dafa60548cbb2299bacb2594bb09b))

## 1.0.0 (2023-03-31)

https://github.com/awslabs/simple-database-archival-solution/commit/9a4328f8ef32040681447eb36e20d3bc0b5fc026
