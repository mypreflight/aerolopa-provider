Feature: Resolving an airline and aircraft type
  As the flight tracker backend
  I want to know which cabin configurations an aircraft type can have
  So that I never present a guess as a fact

  Scenario: A type with a single configuration resolves unambiguously
    Given AeroLOPA publishes the configurations "lh-32n, lh-321, lo-7m8-1"
    When I invoke the function with "airline=LH&aircraft=32N"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "airlineIata": "LH",
        "aircraftIata": "32N",
        "candidateCount": 1,
        "ambiguous": false,
        "candidates": ["lh-32n"],
        "seatMaps": []
      }
      """

  Scenario: A type with several configurations is reported as ambiguous
    Given AeroLOPA publishes the configurations "lo-7m8-1, lo-7m8-2, lo-7m8-3, lh-32n"
    When I invoke the function with "airline=LO&aircraft=7M8"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "airlineIata": "LO",
        "aircraftIata": "7M8",
        "candidateCount": 3,
        "ambiguous": true,
        "candidates": ["lo-7m8-1", "lo-7m8-2", "lo-7m8-3"],
        "seatMaps": []
      }
      """

  Scenario: Airline and aircraft codes are matched case insensitively
    Given AeroLOPA publishes the configurations "lh-32n"
    When I invoke the function with "airline=lh&aircraft=32n"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "airlineIata": "LH",
        "aircraftIata": "32N",
        "candidateCount": 1,
        "ambiguous": false,
        "candidates": ["lh-32n"],
        "seatMaps": []
      }
      """

  Scenario: An unknown pairing resolves to no candidates
    Given AeroLOPA publishes the configurations "lh-32n"
    When I invoke the function with "airline=BA&aircraft=744"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "airlineIata": "BA",
        "aircraftIata": "744",
        "candidateCount": 0,
        "ambiguous": false,
        "candidates": [],
        "seatMaps": []
      }
      """

  Scenario: Seat maps are fetched for every candidate on request
    Given AeroLOPA publishes the configurations "lo-7m8-1, lo-7m8-2"
    And AeroLOPA serves the seat map "lo-7m8-1"
    And AeroLOPA serves the seat map "lo-7m8-2"
    When I invoke the function with "airline=LO&aircraft=7M8&includeSeatMaps=true"
    Then the response status should be 200
    And AeroLOPA should have been asked for "lo-7m8-1" 1 time
    And AeroLOPA should have been asked for "lo-7m8-2" 1 time

  Scenario: The configuration index is fetched once and reused
    Given AeroLOPA publishes the configurations "lh-32n"
    When I invoke the function with "airline=LH&aircraft=32N"
    And I invoke the function with "airline=LH&aircraft=32N"
    Then the response status should be 200
    And AeroLOPA should have been asked for the configuration index 1 time
