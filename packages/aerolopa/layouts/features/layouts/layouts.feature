Feature: Listing the layout index
  As the flight tracker backend
  I want the identifiers of every published cabin layout
  So that I can offer a picker without fetching a seat map for each one

  Scenario: Listing every published layout
    Given AeroLOPA publishes the layouts "lh-32n, lo-7m8-1, aa-a321t"
    When I invoke the function
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "count": 3,
        "layouts": [
          { "id": "lh-32n", "airlineIata": "LH", "aircraftIata": "32N", "variant": null },
          { "id": "lo-7m8-1", "airlineIata": "LO", "aircraftIata": "7M8", "variant": "1" },
          { "id": "aa-a321t", "airlineIata": "AA", "aircraftIata": "A321T", "variant": null }
        ]
      }
      """

  Scenario: Every variant of an ambiguous airline and type pair is listed separately
    Given AeroLOPA publishes the layouts "lo-7m8-1, lo-7m8-2, lo-7m8-3"
    When I invoke the function
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "count": 3,
        "layouts": [
          { "id": "lo-7m8-1", "airlineIata": "LO", "aircraftIata": "7M8", "variant": "1" },
          { "id": "lo-7m8-2", "airlineIata": "LO", "aircraftIata": "7M8", "variant": "2" },
          { "id": "lo-7m8-3", "airlineIata": "LO", "aircraftIata": "7M8", "variant": "3" }
        ]
      }
      """

  Scenario: Pages that are not layouts are left out of the index
    Given AeroLOPA publishes the layouts "lh-32n"
    When I invoke the function
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "count": 1,
        "layouts": [
          { "id": "lh-32n", "airlineIata": "LH", "aircraftIata": "32N", "variant": null }
        ]
      }
      """

  Scenario: The index is fetched once and served from cache afterwards
    Given AeroLOPA publishes the layouts "lh-32n"
    When I invoke the function
    And I invoke the function
    Then the response status should be 200
    And AeroLOPA should have been asked for the layout index 1 time
