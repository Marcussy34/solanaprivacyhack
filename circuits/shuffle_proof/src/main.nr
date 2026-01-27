use dep::std;
use dep::poseidon;

fn main(
    // Private inputs
    seed: Field,
    shuffled_deck: [u8; 52],

    // Public inputs
    deck_commitment: pub Field
) -> pub Field {
    // 1. Verify shuffled_deck is a permutation of 0..51
    // Check that every card in original_deck appears exactly once in shuffled_deck
    let mut used = [false; 52];
    for i in 0..52 {
        let card = shuffled_deck[i];
        // Card must be valid (0-51)
        assert(card < 52);
        // Card must not have been used yet
        assert(!used[card as u32]);
        used[card as u32] = true;
    }

    // 2. Verify commitment matches shuffled deck + seed
    // Use chaining since generic hash might not be available
    // h_0 = seed
    // h_{i+1} = hash_2([h_i, card_i])
    let mut current_hash = seed;
    for i in 0..52 {
        current_hash = poseidon::poseidon::bn254::hash_2([current_hash, shuffled_deck[i] as Field]);
    }

    assert(current_hash == deck_commitment);

    // Return the commitment for verification
    current_hash
}

#[test]
fn test_valid_shuffle() {
    // Original deck: 0-51
    let mut original: [u8; 52] = [0; 52];
    for i in 0..52 {
        original[i] = i as u8;
    }
    
    // Shuffled deck (just a shift for testing)
    let mut shuffled: [u8; 52] = [0; 52];
    for i in 0..52 {
        shuffled[i] = ((i + 1) % 52) as u8;
    }
    
    let seed: Field = 12345;

    // Calculate commitment
    let mut commitment = seed;
    for i in 0..52 {
        commitment = poseidon::poseidon::bn254::hash_2([commitment, shuffled[i] as Field]);
    }

    let result = main(seed, shuffled, commitment, original);
    assert(result == commitment);
}
