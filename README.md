# StitchNote – Tailoring Customer Measurement Management System

A simple, lightweight web application for storing, searching, and managing tailoring customer details and measurements.

## 1. Project Overview

StitchNote is a browser-based customer measurement management system designed for tailoring businesses. It helps tailors maintain customer records digitally instead of writing measurements in notebooks or searching through paper records.

The application provides a simple interface where users can search for customers by name or phone number, view saved measurements, add new customer records, and store an optional measurement diagram or image.

The application is built using HTML, CSS, and JavaScript. It does not require a backend server or database installation for basic local use.

## 2. Project Objectives

- Digitally store customer names and phone numbers.
- Record and organize customer tailoring measurements.
- Quickly find existing customers using a name or phone number.
- Provide predefined Tamil measurement fields for regular tailoring work.
- Allow additional measurement fields when required.
- Attach an optional measurement diagram or image to a customer record.
- Display saved customer records in a simple, clean interface.
- Provide a basic PIN prompt before adding a customer.
- Make the application easy to use and deploy as a static website.

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Defines the application structure and forms |
| CSS3 | Provides styling, layout, and responsive design |
| JavaScript | Implements search, customer management, and validation |
| Browser Local Storage | Stores customer records in the browser |
| FileReader API | Reads selected images for preview and storage |
| GitHub Pages / Netlify | Optional static website hosting |

No React, Python, FastAPI, Node.js backend, or external database is required for the current version.

## 4. Project Features

### 4.1 Customer Search

The application provides a search bar that allows users to search customer records using:

- Customer name
- Phone number

The customer list updates automatically while the user types. Name searches are case-insensitive, and partial phone-number searches are supported.

### 4.2 Customer Record List

Saved customer records appear in a simple list.

Each record displays:
- Customer name
- Phone number, if provided
- Record creation date

Selecting a customer opens the customer's saved details, including measurements, notes, and an uploaded image if available.

### 4.3 PIN-Protected Customer Creation

Before adding a new customer, the application requests a four-digit PIN.

The default PIN is:

`4826`

To change the PIN, open `script.js` and find:

```javascript
const ADD_CUSTOMER_PIN = "4826";
