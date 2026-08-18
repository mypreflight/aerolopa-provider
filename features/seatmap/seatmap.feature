Feature: Fetching a seat map
  As the flight tracker backend
  I want to fetch a cabin layout by configuration slug
  So that I can show a pilot where the seats are

  Scenario: Fetching a known configuration
    Given AeroLOPA serves the seat map "lh-32n"
    When I invoke the function with "slug=lh-32n"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "seatMap": {
          "slug": "lh-32n",
          "airlineIata": "LH",
          "aircraftIata": "32N",
          "aircraftType": "Airbus A320-271N",
          "aircraftTypeDisplayed": "Airbus A320neo",
          "manufacturer": "Airbus",
          "haulType": "Short Haul",
          "isDualDeck": false,
          "totalSeats": 4,
          "lastUpdated": "2025-08-23",
          "seatCounts": {
            "first": 0,
            "business": 0,
            "premium_economy": 0,
            "economy": 4,
            "total": 4
          },
          "canvas": { "width": 800, "height": 3970 },
          "assets": {
            "image": "@url",
            "imageNeutral": "@url",
            "svg": "@url",
            "seatRects": "@url"
          },
          "cabins": [
            {
              "code": "M",
              "name": "Economy seats",
              "seatCount": 4,
              "rows": "1 to 2",
              "pitch": "30\"",
              "width": "18\"",
              "recline": "2\"",
              "description": "Slimline seats"
            }
          ],
          "seats": "@any"
        }
      }
      """

  Scenario: Seat geometry and ratings are mapped onto domain names
    Given AeroLOPA serves the seat map "lh-32n"
    When I invoke the function with "slug=lh-32n"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "seatMap": {
          "slug": "@any",
          "airlineIata": "@any",
          "aircraftIata": "@any",
          "aircraftType": "@any",
          "aircraftTypeDisplayed": "@any",
          "manufacturer": "@any",
          "haulType": "@any",
          "isDualDeck": "@any",
          "totalSeats": "@any",
          "lastUpdated": "@any",
          "seatCounts": "@any",
          "canvas": "@any",
          "assets": "@any",
          "cabins": "@any",
          "seats": [
            {
              "designator": "01A",
              "x": 100,
              "y": 200,
              "width": 40,
              "height": 60,
              "rotation": 0,
              "reversed": false,
              "cabin": "economy",
              "rating": "green",
              "color": "",
              "bookable": true,
              "blocked": false,
              "crewRest": false,
              "windowStatus": "great",
              "seatProduct": null,
              "comments": []
            },
            {
              "designator": "01B",
              "x": 100,
              "y": 200,
              "width": 40,
              "height": 60,
              "rotation": 0,
              "reversed": false,
              "cabin": "economy",
              "rating": null,
              "color": "",
              "bookable": true,
              "blocked": false,
              "crewRest": false,
              "windowStatus": null,
              "seatProduct": null,
              "comments": []
            },
            {
              "designator": "01C",
              "x": 100,
              "y": 200,
              "width": 40,
              "height": 60,
              "rotation": 0,
              "reversed": false,
              "cabin": "economy",
              "rating": "red",
              "color": "#dc3c3c",
              "bookable": true,
              "blocked": false,
              "crewRest": false,
              "windowStatus": null,
              "seatProduct": null,
              "comments": [
                {
                  "slug": "bathroom_door",
                  "comment": "Immediately adjacent to lavatory",
                  "sentiment": "bad",
                  "severity": "major"
                }
              ]
            },
            {
              "designator": "02A",
              "x": 100,
              "y": 200,
              "width": 40,
              "height": 60,
              "rotation": 0,
              "reversed": false,
              "cabin": "economy",
              "rating": null,
              "color": "",
              "bookable": false,
              "blocked": true,
              "crewRest": true,
              "windowStatus": "great",
              "seatProduct": null,
              "comments": []
            }
          ]
        }
      }
      """

  Scenario: Falling back to the HTML payload when the RSC response carries no seats
    Given AeroLOPA serves the seat map "lh-32n" only as HTML
    When I invoke the function with "slug=lh-32n"
    Then the response status should be 200
    And the response body should have the property "seatMap.slug"
    And AeroLOPA should have been asked for "lh-32n" 2 times

  Scenario: A repeated lookup is served from cache
    Given AeroLOPA serves the seat map "lh-32n"
    When I invoke the function with "slug=lh-32n"
    And I invoke the function with "slug=lh-32n"
    Then the response status should be 200
    And AeroLOPA should have been asked for "lh-32n" 1 time
