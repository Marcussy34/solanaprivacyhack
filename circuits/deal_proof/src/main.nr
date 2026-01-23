use poseidon::poseidon::bn254::{hash_14, hash_2};

fn main(
    // Private inputs
    seed: Field,
    shuffled_deck: [u8; 13],
    blinding_factor: Field,

    // Public inputs
    deck_commitment: pub Field,
    card_commitment: pub Field,
    card_position: pub Field
) -> pub Field {
    // 1. Verify deck commitment matches the shuffled deck.
    //    Must use the same commitment scheme as shuffle_proof:
    //    commitment = Poseidon(seed, deck[0], ..., deck[12])
    let mut hash_input: [Field; 14] = [0; 14];
    hash_input[0] = seed;
    for i in 0..13 {
        hash_input[i + 1] = shuffled_deck[i] as Field;
    }
    let computed_deck_commitment = hash_14(hash_input);
    assert(computed_deck_commitment == deck_commitment);

    // 2. Extract card at the specified position (0-12)
    assert(card_position as u8 < 13);
    let mut card_value: Field = 0;
    for i in 0..13 {
        if i as Field == card_position {
            card_value = shuffled_deck[i] as Field;
        }
    }

    // 3. Verify card commitment = Poseidon(card_value, blinding_factor)
    let computed_card_commitment = hash_2([card_value, blinding_factor]);
    assert(computed_card_commitment == card_commitment);

    // Return the card commitment for on-chain verification
    computed_card_commitment
}

#[test]
fn test_deal_card_at_position_0() {
    // Same deck as shuffle_proof test
    let seed: Field = 12345;
    let shuffled: [u8; 13] = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7];
    let position: Field = 0;
    let blinding: Field = 99999;

    // Card at position 0 is 5
    let card_value: Field = 5;

    // Compute deck commitment (same as shuffle_proof)
    let mut hash_input: [Field; 14] = [0; 14];
    hash_input[0] = seed;
    for i in 0..13 {
        hash_input[i + 1] = shuffled[i] as Field;
    }
    let deck_comm = hash_14(hash_input);

    // Compute card commitment
    let card_comm = hash_2([card_value, blinding]);

    let result = main(seed, shuffled, blinding, deck_comm, card_comm, position);
    assert(result == card_comm);
}

#[test]
fn test_deal_card_at_position_4() {
    let seed: Field = 12345;
    let shuffled: [u8; 13] = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7];
    let position: Field = 4;
    let blinding: Field = 77777;

    // Card at position 4 is 8
    let card_value: Field = 8;

    let mut hash_input: [Field; 14] = [0; 14];
    hash_input[0] = seed;
    for i in 0..13 {
        hash_input[i + 1] = shuffled[i] as Field;
    }
    let deck_comm = hash_14(hash_input);
    let card_comm = hash_2([card_value, blinding]);

    let result = main(seed, shuffled, blinding, deck_comm, card_comm, position);
    assert(result == card_comm);
}

#[test]
fn test_deal_last_card() {
    let seed: Field = 12345;
    let shuffled: [u8; 13] = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7];
    let position: Field = 12;
    let blinding: Field = 55555;

    // Card at position 12 is 7
    let card_value: Field = 7;

    let mut hash_input: [Field; 14] = [0; 14];
    hash_input[0] = seed;
    for i in 0..13 {
        hash_input[i + 1] = shuffled[i] as Field;
    }
    let deck_comm = hash_14(hash_input);
    let card_comm = hash_2([card_value, blinding]);

    let result = main(seed, shuffled, blinding, deck_comm, card_comm, position);
    assert(result == card_comm);
}
